import { useEffect, useRef } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';

// Simple thumbnail canvas renderer
function FrameThumbnail({ imageData, index, isSelected, isTrimmed, onClick, onDelete, onDragStart, onDragOver, onDrop }) {
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
      onDrop={(e) => onDrop(e, index)}
      title={isTrimmed ? 'Excluded from loop (Click to select)' : 'Drag to reorder, click to select'}
      style={{ userSelect: 'none', opacity: isTrimmed ? 0.3 : 1 }}
    >
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

  const handleSelect = (idx) => {
    dispatch({
      type: TYPES.UPDATE_EDITOR,
      payload: { selectedFrameIndex: idx }
    });
  };

  const handleDelete = (idx) => {
    dispatch({
      type: TYPES.DELETE_FRAME,
      payload: idx
    });
  };

  const handleDragStart = (e, index) => {
    dragStartIdxRef.current = index;
    // Set transparent image for drag feedback to avoid browser default ghosting issues if preferred,
    // but default behavior works nicely.
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
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
      
      <div className="frame-strip-list">
        {frames.map((frame, idx) => {
          const isTrimmed = (idx < trimStart - 1) || (idx >= trimEnd);
          return (
            <FrameThumbnail
              key={`frame-${idx}-${frame.width}x${frame.height}`}
              imageData={frame}
              index={idx}
              isSelected={idx === selectedIndex}
              isTrimmed={isTrimmed}
              onClick={() => handleSelect(idx)}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          );
        })}
      </div>
    </div>
  );
}

export default FrameStrip;
