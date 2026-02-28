# 🔊 Vine Boom HQ Longer

![VS Code Version](https://img.shields.io/badge/VS%20Code-^1.80.0-blue?logo=visual-studio-code)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-orange)

> **Vine Boom HQ Longer** is a high-performance, meme-powered VS Code extension designed to turn your syntax errors into **instant auditory feedback**. Experience the 🧠 **Vine Boom** (and 10 other legendary sounds) the moment a red squiggle appears! ✅

---

<p align="center">
  <img src="./icon.ico" width="128" alt="Vine Boom HQ Icon">
</p>

---

## 📚 Table of Contents
*   [📌 Project Overview](#-project-overview)
*   [✨ Key Features](#-key-features)
*   [🔊 Sound Library](#-sound-library)
*   [🚀 Usage Guide](#-usage-guide)
*   [⚙️ Installation](#-installation)
*   [📋 System Requirements](#-system-requirements)
*   [🛠️ Configuration Settings](#-configuration-settings)
*   [🤝 Contributing](#-contributing)
*   [📄 License](#-license)

---

## 📌 Project Overview
Coding is serious, but debugging doesn't have to be. **Vine Boom HQ Longer** monitors your workspace in real-time. Whenever your error count increases, it triggers a customizable sound effect to keep you alert (and entertained). Whether it's a missing semicolon or a complex logic error, you'll know *immediately*.

---

## ✨ Key Features
*   ✅ **Real-Time Monitoring**: Detects new syntax errors across all open files instantly.
*   ✅ **Live Sound Preview**: Scroll through the sound list in the Command Palette and hear them play in real-time.
*   ✅ **Audio Cancellation**: Fast-scrolling or rapid typing won't overlap sounds—it cuts off the previous sound perfectly.
*   ✅ **Smart Debouncing**: A 2000ms cooldown prevents audio spam if you're making many changes at once.
*   ✅ **Global Persistence**: Your selected sound preference is saved globally across all VS Code windows.

---

## 🔊 Sound Library
Choose from 11 legendary internet meme sounds:
*   **Vine Boom** (The Classic 💥)
*   **Galaxy Meme** 🌌
*   **Brother Eww** 🤢
*   **Spiderman Meme Song** 🕷️
*   **Eh eh ehhhh** 🤷
*   **Error Soundss** ⚠️
*   **Bone Crack** 🦴
*   **Ack** 🗣️
*   **Aayein Meme** 🤨
*   **Hub Intro Sound** ⬛🟧
*   **Dexter Meme** 🔬

---

## 🚀 Usage Guide

### 1️⃣ Triggering an Error
Simply type any invalid code (e.g., `const x = ;`) to hear the selected sound effect.

### 2️⃣ Changing the Sound
1.  Open the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2.  Search for `Error Sounds: Change Sound`.
3.  Use **arrow keys** to scroll—the sounds will preview automatically!
4.  Press **Enter** to save your choice globally.

---

## ⚙️ Installation

### Option A: From VSIX
1.  Download the `.vsix` file from the [Releases](https://github.com/Vamsiindugu/vine-boom-extension/releases) page.
2.  Open VS Code and run `Extensions: Install from VSIX...` from the Command Palette.

### Option B: Local Development
```bash
# Clone the repository
git clone https://github.com/Vamsiindugu/vine-boom-extension.git

# Install dependencies
npm install

# Compile the project
npm run compile
```

---

## 📋 System Requirements
The extension uses native system players for zero-latency audio:

*   **Windows**: Uses PowerShell + `WMPlayer.OCX` (Included with Windows).
*   **macOS**: Uses `afplay` (Pre-installed on macOS).
*   **Linux**: Requires `paplay`, `mpg123`, or `ffplay` to be available in your system path.

---

## 🛠️ Configuration Settings
You can fine-tune the extension via `settings.json`:

```json
{
  "errorSounds.selectedSound": "Vine Boom"
}
```

---

## 🤝 Contributing
Contributions make the meme community thrive! To contribute:

1.  **Fork** the Project.
2.  **Create** your Feature Branch (`git checkout -b feature/NewMeme`).
3.  **Commit** your Changes (`git commit -m 'Add a new funny sound'`).
4.  **Push** to the Branch (`git push origin feature/NewMeme`).
5.  **Open** a Pull Request.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for more information.

---

> *Built with ❤️ by [Vamsi00](https://github.com/Vamsiindugu) for the developer community.*
