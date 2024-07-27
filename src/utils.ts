import * as vscode from 'vscode';  
import * as fs from 'fs';
import * as mime from 'mime';
import axios from 'axios';

export const musicExtensions = ['.mp3', '.wav', '.flac', '.m4a'];

export function isMusicFile(path: string): boolean {
    for (const ext of musicExtensions) {
        if (path.endsWith(ext)) {
            return true;
        }
    }
    return false;
}
  
export async function findAllMusicFiles(): Promise<vscode.Uri[]> {  
    
    let allMusicFiles: vscode.Uri[] = [];  
  
    for (const ext of musicExtensions) {  
        const pattern = `**/*${ext}`;  
        const uris = await vscode.workspace.findFiles(pattern); 
        allMusicFiles = [...allMusicFiles, ...uris];
    }  
  
    return allMusicFiles;  
}  

export async function chooseImageFromLocal(webviewPanel: vscode.WebviewPanel) {
    const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: '选择专辑封面图片',
        filters: {
            'images': ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp']
        }
    });

    if (uris) {
        const uri = uris[0];
        const filePath = uri.fsPath;
        const mimeType = mime.default.getType(filePath);
        const buffer = fs.readFileSync(filePath);
        const uint8array = new Uint8Array(buffer);
        webviewPanel.webview.postMessage({
            command: 'fetch-image',
            data: { mimeType, uint8array }
        });
    }
}

export async function chooseImageFromNetwork(webviewPanel: vscode.WebviewPanel) {
    const value = await vscode.window.showInputBox({
        placeHolder: '输入图像的链接，比如 https://picx.zhimg.com/80/v2-9377476212f1c1e44ebe6c8071da8341_1440w.jpeg',
        validateInput: (value: string) => {  
            // 这里可以添加输入验证逻辑  
            if (!value || value.length === 0 || (!value.startsWith('http'))) {  
                return '无效的图像链接！';  
            }
            return null;
        }
    });

    if (value) {
        const response = await axios({
            method: 'get',
            url: value,
            responseType: 'arraybuffer'
        });

        const mimeType = response.headers['content-type'] || 'application/octet-stream';
        const uint8array = new Uint8Array(response.data);

        webviewPanel.webview.postMessage({
            command: 'fetch-image',
            data: { mimeType, uint8array }
        });
    }
}