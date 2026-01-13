# M/L Editor (Markdown & LaTeX)

A rich, no-lag, offline-capable text editor built for Markdown and LaTeX editing.

## Features

- **Live Preview**: Real-time rendering of Markdown and LaTeX.
- **Split View**: Code on the left, compiled output on the right.
- **Local File Access**: Open and Save files directly to your disk using the File System Access API.
- **Offline Capable**: Works fully offline.
- **Rich UI**: Dark mode, smooth transitions, and a premium feel.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

## Usage

- **Opening Files**: Click "Open" to edit local `.md` files.
- **Saving**: Click "Save" to save back to disk.
- **Math**: Use `$$` for block math and `$` for inline math.
- **Hide Preview**: Toggle the preview pane for a distraction-free writing experience.

## Tech Stack

- **Vite + React + TypeScript**
- **Monaco Editor** (VS Code's editor engine)
- **KaTeX** for fast math rendering
- **Framer Motion** for animations
