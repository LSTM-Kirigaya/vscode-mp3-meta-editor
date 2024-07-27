import * as fspath from 'path';
import * as fs from 'fs';

import * as vscode from 'vscode';

function getWebviewContent(extensionPath: string, panel?: vscode.WebviewPanel): string {
    // 找到你的 index.html 所在文件夹的绝对路径
    const htmlRoot = fspath.join(extensionPath, 'webview');
    const htmlIndexPath = fspath.join(htmlRoot, 'index.html');
    const html = fs.readFileSync(htmlIndexPath, 'utf-8').replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        const absLocalPath = fspath.resolve(htmlRoot, $2);
        // this.panel 就是你创建的 webview 对象
        const webviewUri = panel?.webview.asWebviewUri(vscode.Uri.file(absLocalPath));
        const replaceHref = $1 + webviewUri?.toString() + '"';
        return replaceHref;
    });
    return html;
}


export function openWebview(context: vscode.ExtensionContext) {    
    const panel = vscode.window.createWebviewPanel(
        'mp3 meta',
        'mp3 meta',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            enableCommandUris: true,
            enableFindWidget: true,
            enableForms: true
        }
    );
    
    const iconPath = fspath.join(context.extensionPath, 'icon', 'guitar.dark.svg');
    
    panel.iconPath = vscode.Uri.file(iconPath);
    const html = getWebviewContent(context.extensionPath, panel);
    panel.webview.html = html;
}

// let debouncePostMessageHandler: NodeJS.Timeout | undefined = undefined;
// function debouncePostMessage(panel: vscode.WebviewPanel, message: any) {
//     if (debouncePostMessageHandler !== undefined) {        
//         clearTimeout(debouncePostMessageHandler);
//     }
//     debouncePostMessageHandler = setTimeout(() => {
//         console.log('send message');
//         panel.webview.postMessage(message);
//     }, 100);
// }