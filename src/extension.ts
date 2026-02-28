import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec, ChildProcess } from 'child_process';
import * as os from 'os';

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
    { label: "Dexter meme", file: "dexter-meme.mp3" }
];

class AudioManager {
    private soundsPath: string;
    private currentProcess: ChildProcess | null = null;

    constructor(extensionPath: string) {
        this.soundsPath = path.join(extensionPath, 'sounds');
    }

    public play(soundLabel: string): void {
        this.stop();
        
        const sound = SOUNDS.find(s => s.label === soundLabel) || SOUNDS[0];
        const filePath = path.join(this.soundsPath, sound.file);
        
        if (fs.existsSync(filePath)) {
            console.log(`[Error Sounds] Playing: ${sound.label}`);
            this.executeAudio(filePath);
        } else {
            console.error(`[Error Sounds] Sound file not found: ${filePath}`);
        }
    }

    public stop(): void {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill();
            } catch {}
            this.currentProcess = null;
        }
    }

    private executeAudio(filePath: string) {
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
        
        this.currentProcess = exec(command, () => {
            this.currentProcess = null;
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    const audioManager = new AudioManager(context.extensionUri.fsPath);
    let lastErrorCounts = new Map<string, number>();
    let debounceTimeout: NodeJS.Timeout | null = null;

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
        const selectedSound = config.get<string>('selectedSound') || 'Vine Boom';
        
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
            if (debounceTimeout) return;
            
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
            if (debounceTimeout) clearTimeout(debounceTimeout);
        }
    });
}

export function deactivate() {}
