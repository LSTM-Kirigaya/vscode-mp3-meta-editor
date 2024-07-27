import * as vscode from 'vscode';
import { openWebview, webviewPanel } from './webview';
import { parseFile } from 'music-metadata';
import { findAllMusicFiles, isMusicFile, chooseImageFromLocal, chooseImageFromNetwork } from './utils';
import Manager from './manage';

let manager: Manager | undefined = undefined;

function registerWebview(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('mp3-meta.preview', async (uri) => {
        openWebview(context);        
        
        if (manager && webviewPanel) {            
            if (isMusicFile(uri.path)) {                
                manager.moveAnchor(uri.path);
            }

            manager.sendMessage(webviewPanel);
            webviewPanel.webview.onDidReceiveMessage(message => {
                if (manager === undefined || webviewPanel === undefined) {
                    return;
                }
                const command = message.command;
                
                switch (command) {
                    case 'clickPrev':
                        manager.goPrev();
                        manager.sendMessage(webviewPanel);
                        break;
                    case 'clickNext':
                        manager.goNext();
                        manager.sendMessage(webviewPanel);
                        break;
                    case 'clickSave':
                        manager.saveMusic(context, webviewPanel, message.data);
                        break;
                    case 'chooseFromLocal':
                        chooseImageFromLocal(webviewPanel);
                        break;
                    case 'chooseFromNetwork':
                        chooseImageFromNetwork(webviewPanel);
                        break;
                    default:
                        break;
                }
            });
        }
    });
}

export async function activate(context: vscode.ExtensionContext) {
    registerWebview(context);
    
    const uris = await findAllMusicFiles();
    if (uris.length > 0) {
        manager = new Manager(uris);
    } else {
        // 没有音乐文件
    }
}

export function deactivate() {}
