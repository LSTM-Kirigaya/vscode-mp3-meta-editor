import * as vscode from 'vscode';
import { openWebview } from './webview';



function registerWebview(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('mp3-meta.preview', () => {
        openWebview(context);
    });
}

export function activate(context: vscode.ExtensionContext) {
    registerWebview(context);
    console.log('mp3-meta start');
}

export function deactivate() {}
