"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const os = require("os");
const SOUNDS = [
    { label: "Vine Boom", file: "vine-boom.mp3" },
    { label: "Eh eh ehhhh", file: "eh-eh-ehhhh.mp3" },
    { label: "Galaxy meme", file: "galaxy-meme.mp3" },
    { label: "Bone crack", file: "bone-crack.mp3" },
    { label: "Ack", file: "ack.mp3" },
    { label: "Brother eww", file: "brother-ewwwwwww.mp3" },
    { label: "Aayein meme", file: "aayein-meme.mp3" },
    { label: "Hub intro", file: "hub-intro-sound.mp3" },
    { label: "Spiderman meme song", file: "spiderman-meme-song.mp3" },
    { label: "Dexter meme", file: "dexter-meme.mp3" },
    { label: "Faaah", file: "faaah.mp3" },
    { label: "Chicken on tree", file: "chicken-on-tree.mp3" },
    { label: "Tuco: Get Out!", file: "tuco-get-out.mp3" },
    { label: "Ki kore", file: "ki-kore.mp3" },
    { label: "Tehelka omlette", file: "tehelka-omlette.mp3" },
    { label: "Gey echo", file: "gey-echo.mp3" },
    { label: "Aji mangal", file: "aji-mangal.mp3" },
    { label: "Oh my god bro", file: "oh-my-god-bro.mp3" },
    { label: "Meme final", file: "meme-final.mp3" },
    { label: "Hacker hai bhai", file: "hacker-hai-bhai.mp3" },
    { label: "Ooo hahah", file: "ooo-hahah.mp3" },
    { label: "Technologia", file: "technologia.mp3" },
    { label: "Laughing dog", file: "laughing-dog.mp3" }
];
class AudioManager {
    soundsPath;
    currentProcess = null;
    constructor(extensionPath) {
        this.soundsPath = path.join(extensionPath, 'sounds');
    }
    play(soundLabel) {
        this.stop();
        const sound = SOUNDS.find(s => s.label === soundLabel) || SOUNDS[0];
        const filePath = path.join(this.soundsPath, sound.file);
        if (fs.existsSync(filePath)) {
            console.log(`[Error Sounds] Playing: ${sound.label}`);
            this.executeAudio(filePath);
        }
        else {
            console.error(`[Error Sounds] Sound file not found: ${filePath}`);
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
        this.currentProcess = (0, child_process_1.exec)(command, () => {
            this.currentProcess = null;
        });
    }
}
function activate(context) {
    const audioManager = new AudioManager(context.extensionUri.fsPath);
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
function deactivate() { }
//# sourceMappingURL=extension.js.map