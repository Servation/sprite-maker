import React, { useRef, useState, useEffect } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { useToast } from '../components/Toast';

// Components & Hooks
import VideoPlayer from '../components/VideoPlayer';
import FrameStrip from '../components/FrameStrip';
import SpritePreview from '../components/SpritePreview';
import AnimationPreview from '../components/AnimationPreview';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';

import useFrameExtraction from '../hooks/useFrameExtraction';
import useBackgroundRemoval from '../hooks/useBackgroundRemoval';
import { assembleSpriteSheet, canvasToBlob } from '../services/sprite-assembler';
import { saveSessionMedia, clearSessionMedia } from '../services/db';
import { quantizeFrames } from '../services/color-quantizer';

function Editor() {
  const { project, editor } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const videoRef = useRef(null);

  // Hook states
  const { extract, isProcessing: isExtracting, progress: extractProgress } = useFrameExtraction();
  const { process: removeBg, resetBackgrounds, isProcessing: isRemovingBg, progress: bgProgress } = useBackgroundRemoval();

  // Local state for editing fields
  const [columns, setColumns] = useState(editor.columns);
  const [padding, setPadding] = useState(editor.padding);
  const [fps, setFps] = useState(editor.fps);
  const [frameW, setFrameW] = useState(editor.frameWidth);
  const [frameH, setFrameH] = useState(editor.frameHeight);
  const [chromaColor, setChromaColor] = useState(editor.chromaKey.color);
  const [chromaTolerance, setChromaTolerance] = useState(editor.chromaKey.tolerance);
  const [chromaEnabled, setChromaEnabled] = useState(editor.chromaKey.enabled);
  const [perspective, setPerspective] = useState(editor.perspective || 'single');
  const [exportType, setExportType] = useState('png'); // 'png' | 'zip' | 'json'

  // Retro Color Quantizer States
  const [quantizeEnabled, setQuantizeEnabled] = useState(editor.colorQuantization?.enabled || false);
  const [quantizeMode, setQuantizeMode] = useState(editor.colorQuantization?.mode || 'custom');
  const [quantizeColors, setQuantizeColors] = useState(editor.colorQuantization?.colors || 16);
  const [quantizeDither, setQuantizeDither] = useState(editor.colorQuantization?.dither || false);

  // Reset Modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [clearMedia, setClearMedia] = useState(true);
  const [clearSettings, setClearSettings] = useState(false);

  // Trim range states (1-indexed bounds)
  const [trimStart, setTrimStart] = useState(1);
  const [trimEnd, setTrimEnd] = useState(1);
  const [debouncedTrimStart, setDebouncedTrimStart] = useState(1);
  const [debouncedTrimEnd, setDebouncedTrimEnd] = useState(1);
  const [prevFramesLength, setPrevFramesLength] = useState(0);

  const allFrames = project.processedFrames;

  // Auto-save media to IndexedDB when video or frames are updated
  useEffect(() => {
    const saveOrClearMedia = async () => {
      try {
        if (project.video || project.frames.length > 0) {
          await saveSessionMedia(project.video, project.frames, project.processedFrames);
        } else if (!project.video && project.frames.length === 0) {
          await clearSessionMedia();
        }
      } catch (err) {
        console.error('IndexedDB session sync failed:', err);
      }
    };
    saveOrClearMedia();
  }, [project.video, project.frames, project.processedFrames]);

  // Sync trim range when frame count changes
  if (allFrames.length !== prevFramesLength) {
    setPrevFramesLength(allFrames.length);
    setTrimStart(1);
    setTrimEnd(allFrames.length || 1);
    setDebouncedTrimStart(1);
    setDebouncedTrimEnd(allFrames.length || 1);
  }

  // Debounce trim range updates for heavy preview renderings (e.g. SpritePreview, AnimationPreview)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTrimStart(trimStart);
      setDebouncedTrimEnd(trimEnd);
    }, 150);
    return () => clearTimeout(handler);
  }, [trimStart, trimEnd]);

  // Sync state to Context
  const updateEditorConfig = (payload) => {
    dispatch({
      type: TYPES.UPDATE_EDITOR,
      payload
    });
  };

  const handleFpsChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFps(val);
    updateEditorConfig({ fps: val });
  };

  const handleColumnsChange = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setColumns(val);
    updateEditorConfig({ columns: val });
  };

  const handlePaddingChange = (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    setPadding(val);
    updateEditorConfig({ padding: val });
  };

  const handleChromaToggle = (e) => {
    const val = e.target.checked;
    setChromaEnabled(val);
    updateEditorConfig({ chromaKey: { ...editor.chromaKey, enabled: val } });
    
    if (val) {
      removeBg(chromaColor, chromaTolerance);
    } else {
      resetBackgrounds();
    }
  };

  const handleColorChange = (colorValue) => {
    setChromaColor(colorValue);
    updateEditorConfig({ chromaKey: { ...editor.chromaKey, color: colorValue } });
    if (chromaEnabled && project.processedFrames.length > 0) {
      removeBg(colorValue, chromaTolerance, false);
    }
  };

  const handleToleranceChange = (toleranceValue) => {
    setChromaTolerance(toleranceValue);
    updateEditorConfig({ chromaKey: { ...editor.chromaKey, tolerance: toleranceValue } });
    if (chromaEnabled && project.processedFrames.length > 0) {
      removeBg(chromaColor, toleranceValue, false);
    }
  };

  const handleSizeChange = (w, h) => {
    const width = parseInt(w, 10) || 32;
    const height = parseInt(h, 10) || 32;
    setFrameW(width);
    setFrameH(height);
    updateEditorConfig({
      frameWidth: width,
      frameHeight: height
    });
  };

  // Retro Quantizer event handlers
  const handleQuantizeToggle = (e) => {
    const val = e.target.checked;
    setQuantizeEnabled(val);
    updateEditorConfig({
      colorQuantization: { ...editor.colorQuantization, enabled: val }
    });
  };

  const handleQuantizeModeChange = (e) => {
    const val = e.target.value;
    setQuantizeMode(val);
    updateEditorConfig({
      colorQuantization: { ...editor.colorQuantization, mode: val }
    });
  };

  const handleColorsChange = (colorsVal) => {
    setQuantizeColors(colorsVal);
    updateEditorConfig({
      colorQuantization: { ...editor.colorQuantization, colors: colorsVal }
    });
  };

  const handleDitherToggle = (e) => {
    const val = e.target.checked;
    setQuantizeDither(val);
    updateEditorConfig({
      colorQuantization: { ...editor.colorQuantization, dither: val }
    });
  };

  // Export handlers
  const handleExportPng = async (framesToExport) => {
    addToast('Compiling sprite sheet...', 'info');
    const compiledCanvas = assembleSpriteSheet(framesToExport, {
      columns: editor.columns,
      frameWidth: editor.frameWidth,
      frameHeight: editor.frameHeight,
      padding: editor.padding,
      perspective: editor.perspective || 'single'
    });

    const pngBlob = await canvasToBlob(compiledCanvas);
    const url = URL.createObjectURL(pngBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `sprite-sheet-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addToast('Sprite sheet PNG exported successfully!', 'success');
  };

  const handleExportZip = async (framesToExport) => {
    addToast('Generating ZIP archive of individual frames...', 'info');
    try {
      const { zipSync } = await import('fflate');
      const zipData = {};
      
      const seqLength = framesToExport.length;
      let numSequences = 1;
      if (editor.perspective === '2way_mirror') numSequences = 2;
      else if (editor.perspective === '4way') numSequences = 4;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = editor.frameWidth;
      tempCanvas.height = editor.frameHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      const mirrorCanvas = document.createElement('canvas');
      mirrorCanvas.width = editor.frameWidth;
      mirrorCanvas.height = editor.frameHeight;
      const mirrorCtx = mirrorCanvas.getContext('2d');
      
      for (let s = 0; s < numSequences; s++) {
        let shouldMirror = false;
        let seqName = `seq_${s}`;
        
        if (editor.perspective === '2way_mirror') {
          shouldMirror = (s === 1);
          seqName = s === 0 ? 'left' : 'right';
        } else if (editor.perspective === '4way') {
          shouldMirror = (s === 3);
          if (s === 0) seqName = 'front';
          else if (s === 1) seqName = 'back';
          else if (s === 2) seqName = 'left';
          else if (s === 3) seqName = 'right';
        }
        
        for (let i = 0; i < seqLength; i++) {
          const frame = framesToExport[i];
          tempCtx.clearRect(0, 0, editor.frameWidth, editor.frameHeight);
          
          if (shouldMirror) {
            mirrorCtx.clearRect(0, 0, editor.frameWidth, editor.frameHeight);
            mirrorCtx.putImageData(frame, 0, 0);
            
            tempCtx.save();
            tempCtx.translate(editor.frameWidth, 0);
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(mirrorCanvas, 0, 0);
            tempCtx.restore();
          } else {
            tempCtx.putImageData(frame, 0, 0);
          }
          
          const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
          const buffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(buffer);
          
          const frameNum = String(i + 1).padStart(2, '0');
          zipData[`${seqName}/frame_${frameNum}.png`] = uint8;
        }
      }
      
      const zipped = zipSync(zipData);
      const zipBlob = new Blob([zipped], { type: 'application/zip' });
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sprite-frames-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addToast('ZIP archive exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast(`ZIP export failed: ${err.message}`, 'error');
    }
  };

  const handleExportJson = (framesToExport) => {
    addToast('Generating JSON metadata coordinates...', 'info');
    try {
      const seqLength = framesToExport.length;
      const cols = Math.min(editor.columns, seqLength);
      const seqRows = Math.ceil(seqLength / cols);
      
      let numSequences = 1;
      if (editor.perspective === '2way_mirror') numSequences = 2;
      else if (editor.perspective === '4way') numSequences = 4;
      
      const totalRows = seqRows * numSequences;
      const canvasWidth = cols * editor.frameWidth + (cols - 1) * editor.padding;
      const canvasHeight = totalRows * editor.frameHeight + (totalRows - 1) * editor.padding;

      const metadata = {
        meta: {
          app: "Sprite Maker",
          version: "1.0",
          image: "sprite-sheet.png",
          format: "RGBA8888",
          size: { w: canvasWidth, h: canvasHeight },
          frameWidth: editor.frameWidth,
          frameHeight: editor.frameHeight,
          fps: editor.fps,
          perspective: editor.perspective || "single"
        },
        frames: {}
      };

      for (let s = 0; s < numSequences; s++) {
        let seqName = `seq_${s}`;
        if (editor.perspective === '2way_mirror') {
          seqName = s === 0 ? 'left' : 'right';
        } else if (editor.perspective === '4way') {
          if (s === 0) seqName = 'front';
          else if (s === 1) seqName = 'back';
          else if (s === 2) seqName = 'left';
          else if (s === 3) seqName = 'right';
        }

        for (let i = 0; i < seqLength; i++) {
          const col = i % cols;
          const row = (s * seqRows) + Math.floor(i / cols);
          const x = col * (editor.frameWidth + editor.padding);
          const y = row * (editor.frameHeight + editor.padding);
          
          const key = `${seqName}_frame_${String(i + 1).padStart(2, '0')}`;
          metadata.frames[key] = {
            frame: { x, y, w: editor.frameWidth, h: editor.frameHeight },
            rotated: false,
            trimmed: false,
            sourceSize: { w: editor.frameWidth, h: editor.frameHeight },
            spriteSourceSize: { x: 0, y: 0, w: editor.frameWidth, h: editor.frameHeight }
          };
        }
      }

      const jsonStr = JSON.stringify(metadata, null, 2);
      const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sprite-sheet-metadata-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('JSON coordinates metadata exported!', 'success');
    } catch (err) {
      console.error(err);
      addToast(`JSON export failed: ${err.message}`, 'error');
    }
  };

  const handleExport = async () => {
    const rawFramesToExport = project.processedFrames.slice(trimStart - 1, trimEnd);
    if (!rawFramesToExport || rawFramesToExport.length === 0) {
      addToast('No frames to export. Please extract frames first.', 'warning');
      return;
    }

    // Apply color quantization filter on export if enabled
    const framesToExport = quantizeFrames(rawFramesToExport, editor.colorQuantization || { enabled: false });

    try {
      if (exportType === 'png') {
        await handleExportPng(framesToExport);
      } else if (exportType === 'zip') {
        await handleExportZip(framesToExport);
      } else if (exportType === 'json') {
        await handleExportJson(framesToExport);
      }
    } catch (err) {
      console.error(err);
      addToast(`Export failed: ${err.message}`, 'error');
    }
  };

  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    setIsResetModalOpen(false);
    
    dispatch({
      type: TYPES.RESET_PROJECT,
      payload: { clearMedia, clearSettings }
    });

    if (clearMedia) {
      try {
        await clearSessionMedia();
      } catch (err) {
        console.error('Failed to clear session IndexedDB on reset:', err);
      }
    }

    addToast('Workspace reset completed successfully!', 'success');
  };

  const hasVideo = !!project.videoUrl;
  const hasFrames = project.processedFrames.length > 0;
  const isBusy = isExtracting || isRemovingBg;
  
  // Slice raw frames first
  const trimmedFrames = allFrames.slice(debouncedTrimStart - 1, debouncedTrimEnd);
  // Apply retro quantization on the display slice for previews
  const displayFrames = quantizeFrames(trimmedFrames, editor.colorQuantization || { enabled: false });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Workspace controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            Sprite Editor Workspace
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Extract animation loops and configure layout parameters to compile game-ready sprite assets.
          </p>
        </div>
        
        {hasVideo && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary text-sm"
              onClick={handleResetClick}
              disabled={isBusy}
            >
              Reset Workspace
            </button>
            {hasFrames && (
              <div style={{ display: 'flex', gap: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  style={{
                    width: '155px',
                    border: 'none',
                    backgroundColor: 'var(--bg-card)',
                    height: '32px',
                    padding: '0 28px 0 8px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  <option value="png" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Sprite Sheet PNG</option>
                  <option value="zip" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Frames ZIP</option>
                  <option value="json" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>JSON Metadata</option>
                </select>
                <button
                  className="btn btn-accent text-sm"
                  onClick={handleExport}
                  disabled={isBusy}
                  style={{ height: '32px', display: 'flex', alignItems: 'center' }}
                >
                  Export Asset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace grid */}
      {!hasVideo ? (
        <div className="card glass" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📁</div>
          <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', marginBottom: '10px' }}>No Media Loaded</h2>
          <p style={{ maxWidth: '400px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
            You need to generate an animation using AI or upload a video clip to begin editing frames.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="#/generate" className="btn btn-primary text-sm">Generate AI Video</a>
            <a href="#/import" className="btn btn-secondary text-sm">Import Local Video</a>
          </div>
        </div>
      ) : (
        <div className="editor-grid">
          
          {/* Left panel - Video and timeline */}
          <div className="workspace-panel">
            {/* Loading Indicator */}
            {isBusy && (
              <div className="card glass">
                <ProgressBar
                  value={isExtracting ? extractProgress : bgProgress}
                  label={isExtracting ? 'Extracting Frames...' : 'Cleaning Background pixels...'}
                />
              </div>
            )}

            {/* Video Player */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Source Clip</span>
                <span className="badge text-xs" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px' }}>Active</span>
              </div>
              <VideoPlayer ref={videoRef} src={project.videoUrl} />
            </div>

            {/* Timeline component */}
            <FrameStrip trimStart={trimStart} trimEnd={trimEnd} />
          </div>

          {/* Right panel - Sheet parameters and output */}
          <div className="workspace-panel">
            {/* Sheet Configurations */}
            <div className="card glass" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Columns */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Grid Columns</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="input"
                  value={columns}
                  onChange={handleColumnsChange}
                  disabled={isBusy || !hasFrames}
                />
              </div>

              {/* Padding */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Frame Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={padding}
                  onChange={handlePaddingChange}
                  disabled={isBusy || !hasFrames}
                />
              </div>

              {/* Perspective Selection */}
              <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                <label className="form-label">Perspective Direction Layout</label>
                <select
                  className="input"
                  value={perspective}
                  onChange={(e) => {
                    setPerspective(e.target.value);
                    updateEditorConfig({ perspective: e.target.value });
                  }}
                  disabled={isBusy || !hasFrames}
                >
                  <option value="single">Single Row (No Mirroring)</option>
                  <option value="2way_mirror">2-Way Mirror (Left & Right Rows)</option>
                  <option value="4way">4-Way (Front, Back, Left, Right Rows)</option>
                </select>
              </div>

              {/* Extraction FPS */}
              <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="form-label">Extraction Rate: {fps} FPS</label>
                  {!hasFrames && <span className="text-xs" style={{ color: 'var(--accent)' }}>Recommended: 10 FPS</span>}
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  className="range-input"
                  value={fps}
                  onChange={handleFpsChange}
                  disabled={isBusy || hasFrames} // Lock FPS once extracted
                />
                {!hasFrames && (
                  <button
                    className="btn btn-primary text-xs w-full mt-4"
                    onClick={extract}
                    disabled={isBusy}
                  >
                    {isExtracting ? 'Extracting...' : 'Extract Frame Strip'}
                  </button>
                )}
              </div>

              {/* Dimensions */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Frame Width</label>
                <select
                  className="input"
                  value={frameW}
                  onChange={(e) => handleSizeChange(e.target.value, frameH)}
                  disabled={isBusy || hasFrames}
                >
                  <option value="16">16 px (Lo-Fi)</option>
                  <option value="32">32 px (Retro)</option>
                  <option value="64">64 px (Standard)</option>
                  <option value="128">128 px (Hi-Bit)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Frame Height</label>
                <select
                  className="input"
                  value={frameH}
                  onChange={(e) => handleSizeChange(frameW, e.target.value)}
                  disabled={isBusy || hasFrames}
                >
                  <option value="16">16 px</option>
                  <option value="32">32 px</option>
                  <option value="64">64 px</option>
                  <option value="128">128 px</option>
                </select>
              </div>
            </div>

            {/* Background chroma key controls */}
            <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Background Key Removal</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    className="toggle-switch-input"
                    checked={chromaEnabled}
                    onChange={handleChromaToggle}
                    disabled={isBusy || !hasFrames}
                  />
                  <span className="toggle-switch-slider" />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Chroma Key</span>
                </label>
              </div>

              {chromaEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Color picker */}
                    <div style={{ flexGrow: 1 }}>
                      <label className="form-label text-xs">Chroma Color</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={chromaColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          disabled={isBusy}
                          style={{ width: '40px', height: '36px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          className="input font-mono"
                          value={chromaColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          disabled={isBusy}
                          style={{ padding: '8px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Tolerance slider */}
                    <div style={{ flexGrow: 2 }}>
                      <label className="form-label text-xs">Tolerance: {chromaTolerance}</label>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        className="range-input"
                        value={chromaTolerance}
                        onChange={(e) => handleToleranceChange(parseInt(e.target.value, 10))}
                        disabled={isBusy}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Retro Color Depth (Quantization) */}
            <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Retro Color Depth</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    className="toggle-switch-input"
                    checked={quantizeEnabled}
                    onChange={handleQuantizeToggle}
                    disabled={isBusy || !hasFrames}
                  />
                  <span className="toggle-switch-slider" />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Apply Palette</span>
                </label>
              </div>

              {quantizeEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Palette Mode */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label text-xs">Palette Console Mode</label>
                      <select
                        className="input"
                        value={quantizeMode}
                        onChange={handleQuantizeModeChange}
                        disabled={isBusy}
                        style={{ height: '36px', padding: '4px 8px', fontSize: '0.85rem' }}
                      >
                        <option value="custom">Custom Quantized Colors</option>
                        <option value="8bit">8-Bit Color (3-3-2 format)</option>
                        <option value="12bit">12-Bit Color (4-4-4 format)</option>
                        <option value="15bit">15-Bit Color (5-5-5 format)</option>
                        <option value="16bit">16-Bit Color (5-6-5 format)</option>
                        <option value="nes">NES Preset (56 Colors)</option>
                        <option value="gameboy">Game Boy Preset (4 Colors)</option>
                        <option value="pico8">PICO-8 Preset (16 Colors)</option>
                        <option value="genesis">Sega Genesis Preset (64 Colors)</option>
                      </select>
                    </div>

                    {/* Dithering toggle */}
                    <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', height: '100%', paddingTop: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={quantizeDither}
                          onChange={handleDitherToggle}
                          disabled={isBusy}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        <span className="text-xs" style={{ fontWeight: 500 }}>Ordered Dithering (Bayer)</span>
                      </label>
                    </div>
                  </div>

                  {/* Colors slider (only visible in custom mode) */}
                  {quantizeMode === 'custom' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label text-xs">Max Palette Colors: {quantizeColors}</label>
                      <input
                        type="range"
                        min="2"
                        max="256"
                        className="range-input"
                        value={quantizeColors}
                        onChange={(e) => handleColorsChange(parseInt(e.target.value, 10))}
                        disabled={isBusy}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loop Trimming Panel */}
            {hasFrames && (
              <div className="card glass">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px' }}>Loop Range Trimming</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label text-xs">Start Frame: {trimStart}</label>
                    <input
                      type="range"
                      min="1"
                      max={Math.max(1, trimEnd - 1)}
                      className="range-input"
                      value={trimStart}
                      onChange={(e) => setTrimStart(parseInt(e.target.value, 10))}
                      disabled={isBusy}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label text-xs">End Frame: {trimEnd}</label>
                    <input
                      type="range"
                      min={Math.min(allFrames.length, trimStart + 1)}
                      max={allFrames.length}
                      className="range-input"
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(parseInt(e.target.value, 10))}
                      disabled={isBusy}
                    />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                  Adjust the sliders to exclude extra transition or overshoot frames. Previews and exports will only use frames {trimStart} to {trimEnd}.
                </p>
              </div>
            )}

            {/* Animation Playback Preview */}
            <AnimationPreview frames={displayFrames} />

            {/* Composite Sheet View */}
            <SpritePreview frames={displayFrames} />
          </div>

        </div>
      )}

      {/* Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        title="Reset Workspace"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
            Select which elements you want to clear from this workspace:
          </p>
          
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={clearMedia}
              onChange={(e) => setClearMedia(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Clear Active Media</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Deletes the loaded video clip and all extracted or chroma-keyed sprite frames from memory and browser storage.
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <input
              type="checkbox"
              checked={clearSettings}
              onChange={(e) => setClearSettings(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Clear Configurations & Settings</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Resets all editor layout states, active local LLM models, API addresses, custom ComfyUI workflows, and API keys.
              </span>
            </div>
          </label>

          <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--warning)', backgroundColor: 'rgba(234, 179, 8, 0.03)', fontSize: '0.8rem', color: 'var(--warning)', marginTop: '8px', lineHeight: '1.4' }}>
            ⚠️ <strong>Warning:</strong> Selected components will be permanently deleted from the browser's database and cannot be recovered.
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Editor;
