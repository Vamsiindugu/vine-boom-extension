import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { exec, ChildProcess } from 'child_process';
import * as os from 'os';

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
    private storagePath: string;
    private currentProcess: ChildProcess | null = null;
    private downloadPromises = new Map<string, Promise<string>>();

    constructor(storagePath: string) {
        this.storagePath = storagePath;
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    public async play(soundLabel: string): Promise<void> {
        this.stop(); // Kill previous overlapping sounds (Audio Cancellation)
        
        const sound = SOUNDS.find(s => s.label === soundLabel) || SOUNDS[0];
        try {
            const filePath = await this.ensureDownloaded(sound.label, sound.url);
            this.executeAudio(filePath);
        } catch {
            // Fail silently
        }
    }

    public stop(): void {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill();
            } catch {}
            this.currentProcess = null;
        }
        
        // On Windows, killing powershell might orphan WMPlayer. 
        // We ensure a robust kill if possible, but standard process.kill is best effort cross-platform.
    }

    private ensureDownloaded(label: string, url: string): Promise<string> {
        const safeName = label.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';
        const dest = path.join(this.storagePath, safeName);

        if (fs.existsSync(dest)) {
            return Promise.resolve(dest);
        }

        if (this.downloadPromises.has(label)) {
            return this.downloadPromises.get(label)!;
        }

        const promise = new Promise<string>((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
                if ([301, 302, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
                    file.close();
                    fs.unlink(dest, () => {});
                    this.ensureDownloaded(label, response.headers.location).then(resolve).catch(reject);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => {});
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(dest);
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        });

        this.downloadPromises.set(label, promise);
        
        promise.catch(() => {
            this.downloadPromises.delete(label);
        });

        return promise;
    }

    private executeAudio(filePath: string) {
        let command = '';
        switch (os.platform()) {
            case 'win32':
                command = `powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "$player = New-Object -ComObject WMPlayer.OCX; $player.URL = '${filePath}'; $player.controls.play(); Start-Sleep -Milliseconds 3000"`;
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
    const audioManager = new AudioManager(context.globalStorageUri.fsPath);
    let lastErrorCounts = new Map<string, number>();
    let debounceTimeout: NodeJS.Timeout | null = null;

    // Command: Change Sound (QuickPick with Live Preview)
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

    // Diagnostic Monitor
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

    // Pre-cache chosen sound
    const initialSound = vscode.workspace.getConfiguration('errorSounds').get<string>('selectedSound') || 'Vine Boom';
    const soundData = SOUNDS.find(s => s.label === initialSound) || SOUNDS[0];
    
    // Lazy download happens here, but we discard play just to force caching
    // A clean way is to ensureDownloaded manually, but since AudioManager methods are private mostly, 
    // We could make ensureDownloaded public, or just add a preload method.
    // For extreme minimalism, we do essentially nothing here since the first error will trigger it,
    // but a preload prevents the first error lag.
    
    // We can just rely on lazy loading upon first error.
}

export function deactivate() {}
