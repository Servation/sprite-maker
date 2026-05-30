import { useEffect, useRef, useState } from 'react';
import { useAppState } from '../context/AppContext';
import { assembleSpriteSheet } from '../services/sprite-assembler';

function SpritePreview({ frames: customFrames }) {
  const { project, editor } = useAppState();
  const canvasRef = useRef(null);
  
  const [zoom, setZoom] = useState('fit'); // 'fit' | '1x' | '2x'

  const frames = customFrames || project.processedFrames;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frames || frames.length === 0) return;

    try {
      // Assemble the sprite sheet on a temporary canvas
      const assembledCanvas = assembleSpriteSheet(frames, {
        columns: editor.columns,
        frameWidth: editor.frameWidth,
        frameHeight: editor.frameHeight,
        padding: editor.padding,
        perspective: editor.perspective || 'single'
      });

      // Match the local canvas dimensions
      canvas.width = assembledCanvas.width;
      canvas.height = assembledCanvas.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw the temporary composite canvas directly onto our render canvas
        ctx.drawImage(assembledCanvas, 0, 0);
      }
    } catch (error) {
      console.error('Error drawing sprite sheet preview:', error);
    }
  }, [frames, editor.columns, editor.frameWidth, editor.frameHeight, editor.padding, editor.perspective]);

  if (!frames || frames.length === 0) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-dark)', textAlign: 'center' }}>
        No frames available to assemble.
      </div>
    );
  }

  // Calculate dimensions dynamically
  const seqLength = frames.length;
  const cols = Math.min(editor.columns, seqLength);
  const seqRows = Math.ceil(seqLength / cols);
  
  let numSequences = 1;
  if (editor.perspective === '2way_mirror') {
    numSequences = 2;
  } else if (editor.perspective === '4way') {
    numSequences = 4;
  }

  const totalRows = seqRows * numSequences;
  const sheetWidth = cols * editor.frameWidth + (cols - 1) * editor.padding;
  const sheetHeight = totalRows * editor.frameHeight + (totalRows - 1) * editor.padding;

  // Calculate dynamic style for zoom
  const getCanvasStyle = () => {
    if (zoom === '1x') {
      return { width: `${sheetWidth}px`, height: `${sheetHeight}px` };
    }
    if (zoom === '2x') {
      return { width: `${sheetWidth * 2}px`, height: `${sheetHeight * 2}px` };
    }
    // 'fit' layout
    return { maxWidth: '100%', maxHeight: '450px', width: 'auto', height: 'auto' };
  };

  return (
    <div className="preview-panel" style={{ height: 'auto', minHeight: '350px' }}>
      <div className="preview-header">
        <div>
          <span style={{ fontWeight: 600 }}>Sprite Sheet Preview</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>
            {sheetWidth} × {sheetHeight} px
          </span>
        </div>
        
        {/* Zoom Controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`btn btn-secondary text-xs ${zoom === 'fit' ? 'active' : ''}`}
            onClick={() => setZoom('fit')}
            style={{ padding: '4px 8px', backgroundColor: zoom === 'fit' ? 'var(--primary)' : '' }}
          >
            Fit
          </button>
          <button
            type="button"
            className={`btn btn-secondary text-xs ${zoom === '1x' ? 'active' : ''}`}
            onClick={() => setZoom('1x')}
            style={{ padding: '4px 8px', backgroundColor: zoom === '1x' ? 'var(--primary)' : '' }}
          >
            1x
          </button>
          <button
            type="button"
            className={`btn btn-secondary text-xs ${zoom === '2x' ? 'active' : ''}`}
            onClick={() => setZoom('2x')}
            style={{ padding: '4px 8px', backgroundColor: zoom === '2x' ? 'var(--primary)' : '' }}
          >
            2x
          </button>
        </div>
      </div>

      <div className="preview-viewport checkerboard">
        <canvas
          ref={canvasRef}
          className="canvas-element"
          style={getCanvasStyle()}
        />
      </div>
    </div>
  );
}

export default SpritePreview;
