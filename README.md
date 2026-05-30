# 👾 Sprite Maker

A premium, browser-based sprite sheet compiler and editor designed for 2D game developers. Generate fluid character animations using cloud or local AI video models, or import your own clips, and compile them into transparent, game-ready sprite sheets.

The entire interface has been styled with a custom **Retro Gamer / Pixel Editor** aesthetic featuring monospace typography, tactile 3D control behaviors, and a classic SNES RPG-style modal system.

---

## 🚀 Key Features

* **Dual Workflows**:
  * 🪄 **Generate (AI)**: Describe a character action and generate a temporally consistent 1:1 looping clip natively using Google's **Veo 3.1** API.
  * 🎬 **Import (Local)**: Upload pre-rendered 3D animations, hand-drawn loops, or clips (MP4/WebM) to bypass AI generation.
* **Variable Frame Extraction**: Seek and sample video frames at custom frame rates (**8–12 FPS** default range) to maintain a punchy, pixelated feel.
* **Automated Chroma Key**: A built-in high-efficiency RGB pixel distance filter to key out solid backgrounds (e.g. green screen) and compile transparent sprites.
* **Segment Trimming**: An interactive slider scrubber timeline to trim start/end boundaries, ensuring seamless looping cycles.
* **Flexible Grid Layouts**: Customize grid columns, frame padding, and canvas sizes (from `16x16` lo-fi up to `128x128` boss size presets).
* **Multi-Directional Layouts**: Compile single direction, 2-way mirrored rows (left/right mirroring), or full 4-way rows (front, back, left, right).
* **Export Options**:
  * 🖼️ **Sprite Sheet (PNG)**: Fully assembled grid sheet with transparency.
  * 📁 **Frames Archive (ZIP)**: Folder of individual numbered frame PNGs.
  * 📄 **Engine Coordinates (JSON)**: Frame dimensions, UV coordinates, and timing metadata (for auto-importing into Unity, Godot, or GameMaker).

---

## 💻 Tech Stack

* **Core Framework**: React 19 + Vite (for ultra-fast HMR and bundling).
* **Routing**: React Router v7.
* **AI Client SDK**: `@google/genai` (native Google Gen AI SDK integration).
* **Decompression**: `fflate` (for fast, client-side ZIP compilation).
* **Styling**: Vanilla CSS custom design variables (located in [index.css](file:///D:/sprite-maker/src/styles/index.css)) utilizing stepped easing functions, sharp layouts, and offset block shadows.

---

## 🛠️ Installation & Getting Started

### 1. Prerequisite
Ensure you have **Node.js** (v18+) installed.

### 2. Install Dependencies
Initialize the node modules folder:
```bash
npm install
```

### 3. Run Development Server
Boot up the local dev workspace:
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### 4. Build for Production
Bundle optimized production assets:
```bash
npm run build
```

---

## ⚙️ Integrations & Local Setup

Sprite Maker runs entirely client-side, sending direct network requests from your browser without intermediate servers. Configuration options are available on the **Settings** screen:

### Cloud API (Gemini / Veo 3.1)
1. Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
2. Enable billing on your cloud project (Veo video generation requires paid tiers).
3. Paste the key in the settings panel. It is stored safely inside your browser's local `localStorage`.

### Local Prompt Helper (LM Studio)
Use a locally running LLM (e.g., Llama-3 or Gemma-2) to expand simple action prompts (e.g. "wizard casting lightning") into detailed description prompts optimized for AI models.
1. Run LM Studio and start a Local Server on port `1234`.
2. Toggle **Enable CORS** inside LM Studio settings.
3. (Optional) Provide a helper API key if running behind an authenticated local proxy.
4. Click **Query Models** to select your loaded LLM model.

### Local Graphics Rendering (ComfyUI / Automatic1111)
Bypass cloud API charges and render prompts offline utilizing your own GPU:
* **Automatic1111**: Start your webui with API and CORS flags enabled:
  ```bash
  webui-user.bat --api --cors-allow-origin=*
  ```
* **ComfyUI**: Connects over WebSockets on port `8188` to parse custom JSON workflows (exported via ComfyUI API format).

---

## 🔒 Security & Privacy

* **Zero Telemetry**: The application collects no telemetry, tracking metrics, or user logs.
* **Direct Connections**: API keys are saved directly in your browser's secure `localStorage`. Network requests are made straight to Google's endpoints or your configured localhost ports without passing through intermediate servers.
