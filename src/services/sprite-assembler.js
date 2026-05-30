/**
 * Assembles an array of ImageData frames into a single sprite sheet canvas
 * @param {ImageData[]} frames - Extracted frames
 * @param {object} options - Grid configurations
 * @param {number} options.columns - Number of columns in the sprite sheet
 * @param {number} options.frameWidth - Width of a single frame
 * @param {number} options.frameHeight - Height of a single frame
 * @param {number} options.padding - Padding between frames in pixels
 * @param {string} options.perspective - Output perspective: 'single' | '2way_mirror' | '4way'
 * @returns {HTMLCanvasElement} The composite canvas containing the sprite sheet
 */
export function assembleSpriteSheet(frames, { 
  columns = 4, 
  frameWidth = 64, 
  frameHeight = 64, 
  padding = 0,
  perspective = 'single'
}) {
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided for sprite sheet assembly.');
  }

  const seqLength = frames.length;
  const cols = Math.min(columns, seqLength);
  const seqRows = Math.ceil(seqLength / cols);
  
  let numSequences = 1;
  if (perspective === '2way_mirror') {
    numSequences = 2;
  } else if (perspective === '4way') {
    numSequences = 4;
  }

  const totalRows = seqRows * numSequences;

  const canvasWidth = cols * frameWidth + (cols - 1) * padding;
  const canvasHeight = totalRows * frameHeight + (totalRows - 1) * padding;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create 2D canvas context for sprite assembly.');
  }

  // Create temporary offscreen canvas to flip frames
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = frameWidth;
  tempCanvas.height = frameHeight;
  const tempCtx = tempCanvas.getContext('2d');

  // Draw each sequence
  for (let s = 0; s < numSequences; s++) {
    // Mirroring rules:
    // - '2way_mirror': row s=1 (Right) is mirrored
    // - '4way': row s=3 (Right) is mirrored
    let shouldMirror = false;
    if (perspective === '2way_mirror' && s === 1) {
      shouldMirror = true;
    } else if (perspective === '4way' && s === 3) {
      shouldMirror = true;
    }

    frames.forEach((frame, index) => {
      const col = index % cols;
      const row = (s * seqRows) + Math.floor(index / cols);
      const x = col * (frameWidth + padding);
      const y = row * (frameHeight + padding);

      if (shouldMirror) {
        tempCtx.clearRect(0, 0, frameWidth, frameHeight);
        tempCtx.putImageData(frame, 0, 0);
        ctx.save();
        ctx.translate(x + frameWidth, y);
        ctx.scale(-1, 1);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
      } else {
        ctx.putImageData(frame, x, y);
      }
    });
  }

  return canvas;
}

/**
 * Converts a canvas element to a PNG Blob
 * @param {HTMLCanvasElement} canvas - The canvas to convert
 * @returns {Promise<Blob>} Resolves to a PNG Blob
 */
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas conversion to Blob failed.'));
      }
    }, 'image/png');
  });
}

export default assembleSpriteSheet;
