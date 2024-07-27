/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fspath from 'path';
import * as fs from 'fs';

import { IPicture, parseFile } from 'music-metadata';
import * as NodeID3 from 'node-id3';

interface IMetaData {
    name: string
    title?: string
    artist?: string
    album?: string
    cover?: IPicture
}

interface IMusicInfo {
    index: number
    [msg: string]: any
}

function getExtensionFromMimeType(mimeType: string) {
    switch (mimeType) {
        case 'image/jpeg':
            return '.jpg';
            break;
        case 'image/png':
            return '.png';
            break;
        case 'image/gif':
            return '.gif';
            break;
        case 'image/bmp':
            return '.bmp';
            break;
        case 'image/webp':
            return '.webp';
            break;
        default:
            return '.jpg';
            break;
    }
}

class Manage {
    musicFiles: string[];
    currentIndex: number;
    path2info: Map<string, IMusicInfo>;
    constructor(uris: vscode.Uri[]) {
        this.musicFiles = [];
        for (const uri of uris) {
            this.musicFiles.push(uri.fsPath.replace(/\\/g, '/').replace(/\\/g, '/'));
        }
        this.currentIndex = 0;
        this.path2info = new Map<string, IMusicInfo>();
        for (let idx = 0; idx < this.musicFiles.length; ++idx) {
            const path = this.musicFiles[idx];
            this.path2info.set(path, { index: idx });
        }
    }

    getFileName(path: string): string {
        const basename = fspath.basename(path);
        const pieces = basename.split('.');
        if (pieces.length === 0) {
            return pieces[0];
        } else {
            pieces.pop();
            return pieces.join('.');
        }
    }

    moveAnchor(file: string) {
        if (file.startsWith('/')) {
            file = file.substring(1).replace(/\\/g, '/').replace(/\\/g, '/');
        }

        const info = this.path2info.get(file);
        if (info) {
            this.currentIndex = info.index;
        }
    }

    async getCurrentInfo(): Promise<IMetaData> {
        const currentFile = this.musicFiles[this.currentIndex];
        const metadata = await parseFile(currentFile);
        const name = this.getFileName(currentFile);
        const title = metadata.common.title;
        const artist = metadata.common.artist;
        const album = metadata.common.album;
        let cover: IPicture | undefined = undefined;
        if (metadata.common.picture) {
            cover = metadata.common.picture[0];
        }
        return { name, title, artist, album, cover };
    }

    async sendMessage(panel: vscode.WebviewPanel) {
        const payload = await this.getCurrentInfo();
        panel.webview.postMessage({
            command: 'music-basic-info',
            data: payload
        });
    }

    async saveMusic(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, data: IMetaData) {
        const extensionPath = context.extensionPath;
        const tmpFolder = fspath.join(extensionPath, 'cache');
        if (!fs.existsSync(tmpFolder)) {
            fs.mkdirSync(tmpFolder, { recursive: true });
        }

        const tags = {
            title: data.title,
            artist: data.artist,
            album: data.album,
            APIC: ''
        };

        if (data.cover) {
            const imageName = 'cover' + getExtensionFromMimeType(data.cover.format);
            const tmpPicturePath = fspath.join(tmpFolder, imageName);
            fs.writeFileSync(tmpPicturePath, data.cover.data);
            tags.APIC = tmpPicturePath;
        }

        let currentFile = this.musicFiles[this.currentIndex];
        let ok = true;

        // 重命名（如果需要的话）
        const currentFileName = fspath.basename(currentFile);
        const modifyFileName = data.name + '.' + currentFileName.split('.').at(-1);
        if (currentFileName !== modifyFileName) {
            const folder = fspath.dirname(currentFile);
            const newPath = fspath.join(folder, modifyFileName).replace(/\\/g, '/').replace(/\\/g, '/');
            
            if (fs.existsSync(newPath)) {
                const res = await vscode.window.showInformationMessage(`重命名的目标路径 ${newPath} 已经存在同名文件，是否覆盖？`,
                    { title: '覆盖', value: true }, { title: '取消', value: false }
                );
                if (res?.value) {

                } else {
                    return;
                }
            }
            fs.renameSync(currentFile, newPath);

            // 修改原本的映射表
            const originInfo = this.path2info.get(currentFile);
            if (originInfo) {
                this.path2info.set(newPath, originInfo);
                this.path2info.delete(currentFile);
            }

            currentFile = newPath;
        }

        // 更改文件 ID3 标签
        NodeID3.update(tags, currentFile, err => {
            if (err !== null) {
                ok = false;
                vscode.window.showErrorMessage(`保存 ${currentFile} 的标签时发生了如下的错误: ${err}`);
            }
        });
        if (ok) {
            vscode.window.showInformationMessage('成功保存标签信息至 ' + currentFile);
            panel.webview.postMessage({
                command: 'success-save'
            });
        }
    }

    goNext() {
        if (this.currentIndex + 1 >= this.musicFiles.length) {
            return;
        }
        this.currentIndex++;
    }

    goPrev() {
        if (this.currentIndex - 1 <= 0) {
            return;
        }
        this.currentIndex--;
    }
}

export default Manage;