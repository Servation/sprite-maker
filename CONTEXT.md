# Sprite Maker — Domain Context

## Glossary

| Term | Definition |
|------|-----------|
| **Nano Banana 2** | Google's Gemini 3.1 Flash Image model. An AI image generation model. Optional/fallback — can be used to generate reference character images that are then fed into a video generation model. |
| **Veo 3.1** | Google's video generation model family (Veo 3.1, Veo 3.1 Lite). Accessed via Gemini API or Vertex AI (billing required). Supports text-to-video and image-to-video. The PRIMARY generation backend for this app. |
| **Sprite Sheet** | A single image file containing a grid of animation frames. Used in 2D game engines to drive character animations. |
| **Animation Loop** | A sequence of frames where a character performs an action and returns to its original pose, enabling seamless looping. |
| **Perspective** | A directional variant of an animation (e.g., walk-left, walk-right, walk-up, walk-down). Determines how many directional sprite rows are needed. |
| **Direction Set** | The collection of perspectives a character needs. Configurable per project: Minimal (2-dir with mirroring), Standard (4-dir), Full (8-dir including diagonals), or Platformer (left + vertical). |
| **Mirroring** | Horizontally flipping a generated sprite to reuse it for the opposite direction (e.g., left → right). Reduces generation cost at the expense of visual uniqueness. A common and accepted technique in 2D games. |
| **Frame** | A single image in an animation sequence, generated individually by the AI model and assembled into a sprite sheet or video. |
| **Frame Rate** | Animation playback speed. Industry standard for pixel art: **8–12 FPS**. 8 FPS = classic/punchy, 10–12 = smooth indie standard, 24+ = loses pixel feel. Professionals use variable timing (holding key frames longer) rather than constant FPS. App default: **10 FPS**. |
| **Frame Size** | Pixel dimensions of each sprite frame. Common tiers: 16×16 (lo-fi), 32×32 (indie sweet spot), 64×64 (hi-bit modern), 128×128 (portraits/bosses). App default: **64×64** (best for AI-generated detail). |
| **Frame Count** | Number of frames per animation. Standards: idle 2–4, walk 4–8, run 6–8, attack 3–6, jump 3–5. Quality of timing matters more than quantity of frames. |
| **Input Mode** | How the user provides character data. Three modes: (1) Text prompt only, (2) Reference image + text prompt, (3) Direct video upload. Modes 1–2 use AI generation; Mode 3 bypasses generation entirely. |
| **Loop Strategy** | How the app ensures seamless animation looping. Three tiers, offered as user options: (1) **Prompt-only** — instruct the AI model to generate a looping clip. (2) **Post-process blend** — automatically cross-fade/morph the last frames into the first to force a seamless loop. (3) **Manual trim** — user scrubs the video and picks start/end frames that match, app handles the rest. |
| **Output Format** | What the user exports. Four types: (1) **Sprite Sheet** (PNG grid — primary deliverable), (2) **Preview Video** (MP4/GIF for animation preview), (3) **Individual Frames** (folder of PNGs), (4) **Metadata File** (JSON with frame count, size, speed, direction labels for engine auto-import). All four available, plus custom layout options. |
| **Sheet Layout** | How frames are arranged in a sprite sheet. Presets for common engines (Unity, Godot, GameMaker, etc.) plus a fully custom option (rows, columns, padding, order). |
| **Platform** | Local web app built with Vite + React. Runs in the browser via `npm run dev`. No backend server — all processing (API calls, video frame extraction, sprite assembly) happens client-side. React chosen for its reactive state model which suits the complex, interconnected editor UI. |
| **API Key** | User provides their own Gemini API key via a settings panel in the app. Stored in `localStorage` with a security warning. No server-side key management. |
| **Action Preset** | A predefined animation action (idle, walk, run, jump, fall, attack, etc.) that includes a detailed prompt template optimized for the AI model. Users can pick presets for convenience or write fully custom free-text prompts. Presets encode best-practice prompt engineering for consistent results. |
| **Background Removal** | Automatic removal of video backgrounds to produce transparent sprite frames. Workflow: prompt the AI for a solid-color background (green/white), then strip it via chroma-key or AI segmentation before sprite sheet assembly. Essential for game-ready sprites. |

## Domain Notes

- The PRIMARY generation backend is Veo 3.1 (or Veo 3.1 Lite for cost savings) — a real video generation model that produces temporally consistent animation clips natively.
- Nano Banana 2 is an OPTIONAL secondary model, useful for generating reference character images that can then be fed into Veo as image-to-video input.
- The system should be flexible enough to swap in other video generation models (non-Google alternatives).
- The app targets 2D game developers who need directional sprite sheets (platformer: left/right + jump/fall; top-down adventure: 4–8 directions).
- The app has TWO major workflows: (1) **Generate workflow** — AI creates frames from text/image input, then assembles into sprite sheet/video. (2) **Import workflow** — user uploads an existing video, app extracts frames and assembles into sprite sheet. The frame extraction and sprite sheet assembly pipeline must work independently from the AI generation pipeline.
- Direction sets are configurable. Users can choose to mirror sprites (e.g., flip left → right) to reduce generation cost, or generate each direction uniquely for higher fidelity.
- Actions use a hybrid model: preset actions with detailed prompt templates for consistency, plus free-text input for custom animations.
- Background removal is automatic: prompt AI for solid-color background, then strip it for transparent sprites.

## Phasing

- **Phase 1 (MVP):** API key setup, text prompt input, reference image upload, Veo video generation, video upload (import workflow), frame extraction, basic sprite sheet assembly (single direction), PNG export with transparency, animation preview.
- **Phase 2 (Full):** Multiple direction sets, mirroring, action presets with prompt templates, all 3 loop strategies, post-processing blend, manual trim scrubber, multiple sheet layout presets, metadata JSON export, GIF/individual frame export.

## Phase 1 Implementation Reference

Below is the design structure for the Phase 1 React MVP implementation, indicating file pathways and responsibilities.

### 1. State Shape (`src/context/AppContext.jsx`)
```javascript
{
  apiKey: string | null,          // from localStorage
  project: {
    video: Blob | null,           // generated or uploaded video
    videoUrl: string | null,      // object URL for playback
    frames: ImageData[],          // extracted frames
    processedFrames: ImageData[], // after background removal
    spriteSheet: Blob | null,     // final assembled sheet
  },
  generation: {
    status: 'idle' | 'submitting' | 'polling' | 'downloading' | 'complete' | 'error',
    operationId: string | null,
    error: string | null,
    progress: number,             // 0-100
  },
  editor: {
    fps: 10,
    frameWidth: 64,
    frameHeight: 64,
    columns: 4,
    padding: 0,
    chromaKey: { color: '#00ff00', tolerance: 30 },
    selectedFrameIndex: number | null,
  }
}
```

### 2. Project File Map

- **Config & Scaffolding:**
  - `package.json` — Vite + React project config & dependencies.
  - `vite.config.js` — React bundler settings.
  - `index.html` — HTML root mount point.
  - `src/main.jsx` — React bootstrapper.
  - `src/App.jsx` — Routing layout shell.
- **Styles:**
  - `src/styles/index.css` — Central CSS variables, dark-theme styling, animations, utilities.
- **State & Router:**
  - `src/context/AppContext.jsx` — Central state provider using `useReducer`.
- **Views (Pages):**
  - `src/pages/Dashboard.jsx` — Entry landing view.
  - `src/pages/Settings.jsx` — API key validation and management.
  - `src/pages/Generate.jsx` — Input for prompt + reference image, cost warning, and progress status tracking.
  - `src/pages/Import.jsx` — Local file drag/drop video upload path.
  - `src/pages/Editor.jsx` — Split-panel frame editor workspace.
- **Custom Hooks:**
  - `src/hooks/useVeoGeneration.js` — Coordinates Veo async execution loop.
  - `src/hooks/useFrameExtraction.js` — Controls seeker-based frame grabbing from video.
  - `src/hooks/useBackgroundRemoval.js` — Coordinates background removal processes.
- **Services (Pure processing logic):**
  - `src/services/veo.js` — Gemini API / Veo 3.1 HTTP connection handlers.
  - `src/services/frame-extractor.js` — Canvas frame sampling functions.
  - `src/services/background-remover.js` — High-efficiency RGB pixel distance filter (chroma-key).
  - `src/services/sprite-assembler.js` — Grid rendering to single composite canvas sheet.
- **Shared Components:**
  - `src/components/Layout.jsx` — Core layout container (Sidebar + Header).
  - `src/components/VideoPlayer.jsx` — Custom media player wrapper.
  - `src/components/FrameStrip.jsx` — Horizontal timeline of frames.
  - `src/components/SpritePreview.jsx` — Auto-updating sprite output viewer.
  - `src/components/AnimationPreview.jsx` — Dynamic loop player for checking quality.
  - `src/components/DragDrop.jsx` — Drag-and-drop file target.
  - `src/components/ProgressBar.jsx` — Fluid loading bars.
  - `src/components/Modal.jsx` — Dark-themed lightbox popups.
  - `src/components/Toast.jsx` — Transient floating alerts.


## Local & Alternative Models Research (2026 Status)

If we decide to support running offline or integrate other APIs, the following model architectures are the most viable for sprite generation:

### 1. Local Image-to-Video Generators (ComfyUI / GPU Driven)
To generate consistent animations locally, these open-source video models are the standard choice:
- **Wan 2.7 (Mixture-of-Experts):** Alibaba's leading open-source model. Excellent at following prompt constraints, supports multi-image reference inputs, and has smaller parameter versions (e.g. 1.3B) that fit consumer GPUs.
- **LTX-Video (Lightricks):** Extremely fast and memory-efficient. Great for lower-spec local GPUs (under 12GB VRAM).
- **HunyuanVideo (Tencent):** Produces smooth, temporally consistent human motion which maps cleanly to character sprite walk/idle cycles.

### 2. Stable Diffusion + ControlNet Workflow (Image-to-Image / Frame-by-Frame)
Instead of generating video directly, a common local workflow is:
1. Generate a consistent character sheet (turnaround) using **Stable Diffusion XL** with a **Pixel Art LoRA** (e.g. *AziibPixelMix*).
2. Use **ControlNet (OpenPose)** loaded with 3D animation skeletal poses (from Cascadeur or PoseMy.art) representing frame sequences.
3. Map the character concept to each skeletal frame to compile the final sprite.

### 3. Pipeline Requirements for Local Integration
To connect this app to a local model:
- The app would need to talk to a local API endpoint (e.g. a running **ComfyUI API** instance at `http://localhost:8188` or **Automatic1111 SD WebUI API** at `http://localhost:7860`).
- The payload format would exchange base64 frames or video clips, matching the existing frame extraction and chroma-key processing pipeline built in Phase 1.

### 4. Local Integrations (Phase 2 Strategy)

We will support two distinct local API integrations in Phase 2:
1. **LM Studio Prompt Helper:**
   - **Endpoint:** Connects to `http://localhost:1234/v1` (LM Studio's local OpenAI-compatible API server).
   - **Role:** Uses a locally running LLM (e.g. Llama-3, Gemma-2) to expand simple input actions (like "wizard attack") into highly detailed, syntax-optimized descriptive prompts for video/image generation models.
2. **Local Diffusion Renderers (ComfyUI / Automatic1111):**
   - **Endpoint:** Configurable local ports (`8188` for ComfyUI, `7860` for Automatic1111).
   - **Role:** Generates animation frames or video loops directly on the user's GPU using open-source models (like Stable Diffusion, LTX-Video, or Wan 2.7), bypassing cloud Veo API expenses.

