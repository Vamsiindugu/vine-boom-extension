"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.activateLegacy = activateLegacy;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const https = require("https");
const child_process_1 = require("child_process");
const os = require("os");
const SOUNDS = [
    { label: "Vine Boom", url: "https://www.myinstants.com/media/sounds/vine-boom.mp3" },
    { label: "Eh eh ehhhh", url: "https://www.myinstants.com/media/sounds/eh-eh-ehhhh.mp3" },
    { label: "Galaxy meme", url: "https://www.myinstants.com/media/sounds/galaxy-meme.mp3" },
    { label: "Error soundss", url: "https://www.myinstants.com/media/sounds/error-soundss.mp3" },
    { label: "Bone crack", url: "https://www.myinstants.com/media/sounds/bone-crack.mp3" },
    { label: "Ack", url: "https://www.myinstants.com/media/sounds/ack.mp3" },
    { label: "Brother eww", url: "https://www.myinstants.com/media/sounds/brother-ewwwwwww.mp3" },
    { label: "Aayein meme", url: "https://www.myinstants.com/media/sounds/aayein-meme.mp3" },
    { label: "Hub intro", url: "https://www.myinstants.com/media/sounds/hub-intro-sound.mp3" },
    { label: "Spiderman meme song", url: "https://www.myinstants.com/media/sounds/spiderman-meme-song.mp3" },
    { label: "Dexter meme", url: "https://www.myinstants.com/media/sounds/dexter-meme.mp3" }
];
class AudioManager {
    storagePath;
    currentProcess = null;
    downloadPromises = new Map();
    constructor(storagePath) {
        this.storagePath = storagePath;
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }
    async play(soundLabel) {
        this.stop();
        const sound = SOUNDS.find(s => s.label === soundLabel) || SOUNDS[0];
        console.log(`[Error Sounds] Attempting to play: ${sound.label}`);
        try {
            const filePath = await this.ensureDownloaded(sound.label, sound.url);
            console.log(`[Error Sounds] Audio file ready: ${filePath}`);
            this.executeAudio(filePath);
        }
        catch (err) {
            console.error(`[Error Sounds] Playback failed: ${err}`);
            vscode.window.showErrorMessage(`Sound playback failed: ${err}`);
        }
    }
    stop() {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill();
            }
            catch { }
            this.currentProcess = null;
        }
    }
    ensureDownloaded(label, url) {
        const safeName = label.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';
        const dest = path.join(this.storagePath, safeName);
        if (fs.existsSync(dest)) {
            return Promise.resolve(dest);
        }
        if (this.downloadPromises.has(label)) {
            return this.downloadPromises.get(label);
        }
        const statusMessage = vscode.window.setStatusBarMessage(`$(sync~spin) Downloading sound: ${label}...`);
        const promise = new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
                if ([301, 302, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
                    file.close();
                    fs.unlink(dest, () => { });
                    this.ensureDownloaded(label, response.headers.location).then(resolve).catch(reject);
                    return;
                }
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => { });
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    statusMessage.dispose();
                    resolve(dest);
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => { });
                statusMessage.dispose();
                reject(err);
            });
        });
        this.downloadPromises.set(label, promise);
        promise.catch(() => {
            this.downloadPromises.delete(label);
        });
        return promise;
    }
    executeAudio(filePath) {
        let command = '';
        const escapedPath = filePath.replace(/'/g, "''");
        switch (os.platform()) {
            case 'win32':
                command = `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open('${escapedPath}'); $player.Play(); Start-Sleep -Milliseconds 5000"`;
                break;
            case 'darwin':
                command = `afplay "${filePath}"`;
                break;
            case 'linux':
                command = `paplay "${filePath}" || mpg123 "${filePath}" || ffplay -nodisp -autoexit "${filePath}"`;
                break;
            default:
                return;
        }
        this.currentProcess = (0, child_process_1.exec)(command, (error) => {
            if (error) {
                console.error(`[Error Sounds] Exec error: ${error.message}`);
            }
            this.currentProcess = null;
        });
    }
}
function activate(context) {
    const audioManager = new AudioManager(context.globalStorageUri.fsPath);
    let lastErrorCounts = new Map();
    let debounceTimeout = null;
    const changeSoundCommand = vscode.commands.registerCommand('errorSounds.changeSound', async () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = SOUNDS.map(s => ({ label: s.label }));
        quickPick.placeholder = "Select an error sound (Arrow keys to preview)";
        quickPick.onDidChangeActive(items => {
            if (items.length > 0) {
                audioManager.play(items[0].label);
            }
        });
        quickPick.onDidAccept(async () => {
            const selection = quickPick.selectedItems[0];
            if (selection) {
                const config = vscode.workspace.getConfiguration('errorSounds');
                await config.update('selectedSound', selection.label, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Error sound set to: ${selection.label}`);
            }
            quickPick.hide();
        });
        quickPick.onDidHide(() => {
            audioManager.stop();
            quickPick.dispose();
        });
        quickPick.show();
    });
    const diagnosticListener = vscode.languages.onDidChangeDiagnostics(e => {
        const config = vscode.workspace.getConfiguration('errorSounds');
        const selectedSound = config.get('selectedSound') || 'Vine Boom';
        let shouldPlay = false;
        for (const uri of e.uris) {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            const errorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const uriStr = uri.toString();
            const previousCount = lastErrorCounts.get(uriStr) || 0;
            if (errorCount > previousCount) {
                shouldPlay = true;
            }
            lastErrorCounts.set(uriStr, errorCount);
        }
        if (shouldPlay) {
            if (debounceTimeout)
                return;
            debounceTimeout = setTimeout(() => {
                debounceTimeout = null;
            }, 2000);
            audioManager.play(selectedSound);
        }
    });
    context.subscriptions.push(changeSoundCommand, diagnosticListener, {
        dispose: () => {
            audioManager.stop();
            lastErrorCounts.clear();
            if (debounceTimeout)
                clearTimeout(debounceTimeout);
        }
    });
}
function activateLegacy(context) {
    // keeping signature for potential exports
}
function deactivate() { }
//# sourceMappingURL=extension.js.map