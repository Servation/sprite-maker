import { useEffect, useRef, useState } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';

// Hover Preview Component
function HoverPreview({ imageData, index, rect }) {
  const canvasRef = useRef(null);
  const size = 160;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [imageData]);

  if (!rect || !imageData) return null;

  const previewWidth = size + 20;
  const previewHeight = size + 60;
  
  let left = rect.left + rect.width / 2 - previewWidth / 2;
  let top = rect.top - previewHeight - 12;
  
  // Constrain to screen boundaries
  left = Math.max(10, Math.min(window.innerWidth - previewWidth - 10, left));
  top = Math.max(10, top);

  return (
    <div style={{
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${previewWidth}px`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      backgroundColor: 'var(--bg-card)',
      border: '2px solid var(--accent)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 15px var(--accent-glow)',
      zIndex: 1000,
      pointerEvents: 'none',
      animation: 'fadeIn 0.15s ease-out',
      imageRendering: 'pixelated'
    }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        // Retro checkerboard background
        background: `repeating-conic-gradient(#222 0% 25%, #151515 0% 50%) 50% / 12px 12px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%', 
            objectFit: 'contain',
            imageRendering: 'pixelated' 
          }} 
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
          FRAME {index + 1}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {imageData.width} × {imageData.height} PX
        </span>
      </div>
    </div>
  );
}

// Simple thumbnail canvas renderer
function FrameThumbnail({ 
  imageData, 
  index, 
  isSelected, 
  isTrimmed, 
  isDragOver, 
  onClick, 
  onDelete, 
  onDragStart, 
  onDragOver, 
  onDragLeave, 
  onDragEnd, 
  onDrop,
  onMouseEnter,
  onMouseLeave
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [imageData]);

  return (
    <div
      className={`frame-thumbnail-wrapper ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={(e) => onDragLeave(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      onMouseEnter={(e) => onMouseEnter && onMouseEnter(e, index)}
      onMouseLeave={onMouseLeave}
      title={isTrimmed ? 'Excluded from loop (Click to select)' : 'Drag to reorder, click to select'}
      style={{ userSelect: 'none', opacity: isTrimmed ? 0.3 : 1, position: 'relative' }}
    >
      {/* Insertion Visual Drop Indicator */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-5px',
          width: '4px',
          height: '100%',
          backgroundColor: 'var(--accent)',
          boxShadow: '0 0 10px var(--accent), 0 0 4px var(--accent)',
          borderRadius: '2px',
          zIndex: 99,
          pointerEvents: 'none' // Ensure indicator doesn't block drag events
        }} />
      )}
      <canvas ref={canvasRef} className="frame-thumbnail" />
      <span className="frame-number-badge">{index + 1}</span>
      <button
        type="button"
        className="frame-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
        title="Delete frame"
      >
        ×
      </button>
    </div>
  );
}

function FrameStrip({ trimStart = 1, trimEnd = 9999 }) {
  const { project, editor } = useAppState();
  const dispatch = useAppDispatch();

  const frames = project.processedFrames;
  const selectedIndex = editor.selectedFrameIndex;
  
  const dragStartIdxRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  
  // Hover preview states
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);

  const handleSelect = (idx) => {
    dispatch({
      type: TYPES.UPDATE_EDITOR,
      payload: { selectedFrameIndex: idx }
    });
  };

  const handleDelete = (idx) => {
    // If deleted frame was hovered, clear hover state
    if (hoveredIdx === idx) {
      setHoveredIdx(null);
      setHoveredRect(null);
    }
    dispatch({
      type: TYPES.DELETE_FRAME,
      payload: idx
    });
  };

  const handleDragStart = (e, index) => {
    dragStartIdxRef.current = index;
    // Clear hover preview immediately on drag start
    setHoveredIdx(null);
    setHoveredRect(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // Required to allow drop
    if (dragStartIdxRef.current !== null && dragStartIdxRef.current !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = (e, index) => {
    setDragOverIdx((prev) => (prev === index ? null : prev));
  };

  const handleDragEnd = () => {
    dragStartIdxRef.current = null;
    setDragOverIdx(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const sourceIdx = dragStartIdxRef.current;
    if (sourceIdx !== null && sourceIdx !== index) {
      dispatch({
        type: TYPES.REORDER_FRAMES,
        payload: { sourceIdx, destIdx: index }
      });
    }
    dragStartIdxRef.current = null;
    setDragOverIdx(null);
  };

  // Hover handlers
  const handleMouseEnter = (e, index) => {
    if (dragStartIdxRef.current !== null) return; // Don't show while dragging
    setHoveredIdx(index);
    setHoveredRect(e.currentTarget.getBoundingClientRect());
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setHoveredRect(null);
  };

  // Clear hover preview on horizontal scroll
  const handleScroll = () => {
    setHoveredIdx(null);
    setHoveredRect(null);
  };

  if (!frames || frames.length === 0) {
    return (
      <div className="frame-strip-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100px', color: 'var(--text-dark)' }}>
        No frames extracted yet. Click "Extract Frames" above.
      </div>
    );
  }

  return (
    <div className="frame-strip-container">
      <div className="frame-strip-header">
        <span>Timeline Frames ({frames.length})</span>
        <span className="text-xs">Drag thumbnails to reorder</span>
      </div>
      
      <div className="frame-strip-list" onScroll={handleScroll}>
        {frames.map((frame, idx) => {
          const isTrimmed = (idx < trimStart - 1) || (idx >= trimEnd);
          return (
            <FrameThumbnail
              key={`frame-${idx}-${frame.width}x${frame.height}`}
              imageData={frame}
              index={idx}
              isSelected={idx === selectedIndex}
              isTrimmed={isTrimmed}
              isDragOver={dragOverIdx === idx}
              onClick={() => handleSelect(idx)}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
      </div>

      {/* Floating Hover Preview Card */}
      {hoveredIdx !== null && hoveredIdx < frames.length && (
        <HoverPreview 
          imageData={frames[hoveredIdx]} 
          index={hoveredIdx} 
          rect={hoveredRect} 
        />
      )}
    </div>
  );
}

export default FrameStrip;
