import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppContext';

function AnimationPreview({ frames: customFrames }) {
  const { project, editor } = useAppState();
  const canvasRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [bgType, setBgType] = useState('transparent'); // 'transparent' | 'solid-black' | 'solid-white'
  const [speedMultiplier, setSpeedMultiplier] = useState(1); // 0.25 | 0.5 | 1 | 2

  const frames = customFrames || project.processedFrames;
  const fps = editor.fps;

  const [prevFramesCount, setPrevFramesCount] = useState(0);
  if (frames.length !== prevFramesCount) {
    setPrevFramesCount(frames.length);
    setCurrentFrameIdx(0);
  }

  const safeFrameIdx = currentFrameIdx < frames.length ? currentFrameIdx : 0;

  // Animation cycle loop
  useEffect(() => {
    if (!isPlaying || !frames || frames.length === 0) return;

    // Adjust speed based on FPS and speed multiplier
    const intervalTime = (1000 / fps) / speedMultiplier;
    const intervalId = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, intervalTime);

    return () => clearInterval(intervalId);
  }, [isPlaying, frames, fps, speedMultiplier]);

  // Handle drawing the current frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames || frames.length === 0) return;

    const activeFrame = frames[safeFrameIdx];
    canvas.width = activeFrame.width;
    canvas.height = activeFrame.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(activeFrame, 0, 0);
    }
  }, [frames, safeFrameIdx]);

  if (!frames || frames.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-dark)', textAlign: 'center', fontSize: '0.85rem' }}>
        No animation preview.
      </div>
    );
  }

  const getViewportBgStyle = () => {
    if (bgType === 'solid-black') {
      return { 
        backgroundImage: 'linear-gradient(to right, #000000, #000000)',
        backgroundColor: '#000000' 
      };
    }
    if (bgType === 'solid-white') {
      return { 
        backgroundImage: 'linear-gradient(to right, #ffffff, #ffffff)',
        backgroundColor: '#ffffff' 
      };
    }
    return {}; // Checkerboard default class handles it
  };

  const handleScrub = (e) => {
    setIsPlaying(false);
    setCurrentFrameIdx(parseInt(e.target.value, 10));
  };

  const handlePrevFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIdx((prev) => (prev - 1 + frames.length) % frames.length);
  };

  const handleNextFrame = () => {
    setIsPlaying(false);
    setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
  };

  return (
    <div className="card glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Animation Loop Preview</h3>
        
        {/* Playback speed selector */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Speed:</span>
          {[0.25, 0.5, 1, 2].map((mult) => (
            <button
              key={`speed-${mult}`}
              type="button"
              className={`btn btn-secondary text-xs`}
              onClick={() => setSpeedMultiplier(mult)}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: speedMultiplier === mult ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                borderColor: speedMultiplier === mult ? 'var(--primary)' : 'var(--border-color)',
                fontSize: '0.75rem'
              }}
            >
              {mult}x
            </button>
          ))}
        </div>
      </div>

      {/* Frame Viewer */}
      <div
        className={bgType === 'transparent' ? 'checkerboard' : ''}
        style={{
          height: '140px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-color)',
          ...getViewportBgStyle()
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `${editor.frameWidth * 1.5}px`,
            height: `${editor.frameHeight * 1.5}px`,
            imageRendering: 'pixelated'
          }}
        />
      </div>

      {/* Scrubber Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Frame Scrubber: {safeFrameIdx + 1} / {frames.length}</span>
          <span>{Math.round(fps * speedMultiplier)} FPS</span>
        </div>
        <input
          type="range"
          min="0"
          max={frames.length - 1}
          value={safeFrameIdx}
          onChange={handleScrub}
          className="range-input"
          style={{ margin: '4px 0 0 0' }}
        />
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Play/Pause */}
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{ flexGrow: 1, padding: '6px 12px', display: 'flex', gap: '4px', justifyContent: 'center' }}
        >
          {isPlaying ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        {/* Step Backward */}
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={handlePrevFrame}
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          title="Previous Frame"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Step Forward */}
        <button
          type="button"
          className="btn btn-secondary text-xs"
          onClick={handleNextFrame}
          style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          title="Next Frame"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* Background Selector */}
        <select
          value={bgType}
          onChange={(e) => setBgType(e.target.value)}
          className="input text-xs"
          style={{ width: 'auto', padding: '4px 8px', height: '28px', backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', margin: 0 }}
        >
          <option value="transparent">Checkerboard</option>
          <option value="solid-black">Solid Black</option>
          <option value="solid-white">Solid White</option>
        </select>
      </div>
    </div>
  );
}

export default AnimationPreview;
