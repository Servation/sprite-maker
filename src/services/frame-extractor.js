/**
 * Asynchronously slices an image Blob into grid frames of target dimensions
 * @param {Blob} imageBlob - The image file to slice
 * @param {object} options - Extraction configurations
 * @param {number} options.frameWidth - Output width for each frame
 * @param {number} options.frameHeight - Output height for each frame
 * @param {function} [options.onProgress] - Callback function for progress updates (0-100)
 * @returns {Promise<ImageData[]>} Resolves to an array of ImageData frames
 */
export function extractFramesFromImage(imageBlob, { frameWidth = 64, frameHeight = 64, onProgress }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        
        const cols = Math.floor(naturalWidth / frameWidth);
        const rows = Math.floor(naturalHeight / frameHeight);
        const totalFrames = cols * rows;
        
        if (totalFrames === 0) {
          throw new Error(`The image resolution (${naturalWidth}x${naturalHeight}) is smaller than target frame dimensions (${frameWidth}x${frameHeight}).`);
        }

        const frames = [];
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Could not create 2D canvas context for frame extraction.');
        }

        let frameCount = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, frameWidth, frameHeight);
            ctx.drawImage(
              img,
              c * frameWidth,
              r * frameHeight,
              frameWidth,
              frameHeight,
              0,
              0,
              frameWidth,
              frameHeight
            );
            
            const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
            frames.push(imgData);
            
            frameCount++;
            if (onProgress) {
              const pct = (frameCount / totalFrames) * 100;
              onProgress(pct);
            }
          }
        }

        URL.revokeObjectURL(img.src);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(img.src);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for frame extraction.'));
    };
  });
}

/**
 * Asynchronously extracts frames from a video Blob at a target frame rate (FPS)
 * @param {Blob} videoBlob - The video file to process
 * @param {object} options - Extraction configurations
 * @param {number} options.fps - Target frames per second
 * @param {number} options.frameWidth - Output width for each frame
 * @param {number} options.frameHeight - Output height for each frame
 * @param {function} [options.onProgress] - Callback function for progress updates (0-100)
 * @returns {Promise<ImageData[]>} Resolves to an array of ImageData frames
 */
export function extractFramesFromVideo(videoBlob, { fps = 10, frameWidth = 64, frameHeight = 64, onProgress }) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;
    
    // Ensure CORS isn't blocked
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadedmetadata', async () => {
      try {
        const duration = video.duration;
        const totalFrames = Math.ceil(duration * fps);
        const step = 1 / fps;
        const frames = [];

        // Create canvas to draw frames
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Could not create 2D canvas context for frame extraction.');
        }

        let currentSeekTime = 0;
        let frameIndex = 0;

        // Sequence generator using a recursive seek check
        const captureNextFrame = async () => {
          if (currentSeekTime >= duration || frameIndex >= totalFrames) {
            // Clean up resources
            URL.revokeObjectURL(video.src);
            video.src = '';
            resolve(frames);
            return;
          }

          // Seek to the time
          video.currentTime = currentSeekTime;

          // Set up one-shot event listener for the "seeked" event
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);

            // Draw current video frame onto canvas (resizing/cropping automatically)
            ctx.clearRect(0, 0, frameWidth, frameHeight);
            
            // Draw maintaining aspect ratio (Contain fit - no cropping)
            const videoRatio = video.videoWidth / video.videoHeight;
            const targetRatio = frameWidth / frameHeight;
            
            let drawWidth = frameWidth;
            let drawHeight = frameHeight;
            let dx = 0;
            let dy = 0;

            if (videoRatio > targetRatio) {
              // Video is wider than target: fit to width, letterbox top/bottom
              drawHeight = frameWidth / videoRatio;
              dy = (frameHeight - drawHeight) / 2;
            } else if (videoRatio < targetRatio) {
              // Video is taller than target: fit to height, pillarbox sides
              drawWidth = frameHeight * videoRatio;
              dx = (frameWidth - drawWidth) / 2;
            }

            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, dx, dy, drawWidth, drawHeight);

            // Capture ImageData
            const imgData = ctx.getImageData(0, 0, frameWidth, frameHeight);
            frames.push(imgData);

            // Report progress
            frameIndex++;
            if (onProgress) {
              const pct = (frameIndex / totalFrames) * 100;
              onProgress(pct);
            }

            // Advance seek time and capture next
            currentSeekTime += step;
            captureNextFrame();
          };

          video.addEventListener('seeked', onSeeked);
        };

        // Start seek loop
        captureNextFrame();
      } catch (err) {
        URL.revokeObjectURL(video.src);
        video.src = '';
        reject(err);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(video.src);
      video.src = '';
      reject(new Error('Video loading or decoding error.'));
    });
  });
}

/**
 * Master frame extraction function supporting both Video and Image inputs
 */
export function extractFrames(blob, options = {}) {
  if (blob && blob.type && blob.type.startsWith('image/')) {
    return extractFramesFromImage(blob, options);
  }
  return extractFramesFromVideo(blob, options);
}
