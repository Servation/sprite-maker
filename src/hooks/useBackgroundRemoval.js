import { useState, useCallback } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { removeBackground } from '../services/background-remover';
import { useToast } from '../components/Toast';

export function useBackgroundRemoval() {
  const { project, editor } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const process = useCallback(async (customColor = null, customTolerance = null, showToast = true) => {
    const rawFrames = project.frames;
    
    if (!rawFrames || rawFrames.length === 0) {
      if (showToast) addToast('No frames extracted to remove background from.', 'warning');
      return;
    }

    const color = customColor || editor.chromaKey.color;
    const tolerance = customTolerance !== null ? customTolerance : editor.chromaKey.tolerance;

    setIsProcessing(true);
    setProgress(0);
    if (showToast) addToast('Processing background removal...', 'info');

    // Run processing asynchronously in small chunks to avoid locking the UI thread
    try {
      const processed = [];
      const batchSize = 4; // Process 4 frames per animation tick
      
      const processBatch = (startIndex) => {
        return new Promise((resolveBatch) => {
          requestAnimationFrame(() => {
            const endIndex = Math.min(startIndex + batchSize, rawFrames.length);
            
            for (let i = startIndex; i < endIndex; i++) {
              const frame = rawFrames[i];
              const result = removeBackground(frame, color, tolerance);
              processed.push(result);
            }
            
            const pct = (endIndex / rawFrames.length) * 100;
            setProgress(pct);
            
            resolveBatch(endIndex);
          });
        });
      };

      let currentIndex = 0;
      while (currentIndex < rawFrames.length) {
        currentIndex = await processBatch(currentIndex);
      }

      dispatch({
        type: TYPES.SET_PROCESSED_FRAMES,
        payload: processed
      });

      if (showToast) addToast('Background removal completed!', 'success');
    } catch (error) {
      console.error('Background removal failed:', error);
      if (showToast) addToast(`Background removal failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [project.frames, editor.chromaKey.color, editor.chromaKey.tolerance, dispatch, addToast]);

  const resetBackgrounds = useCallback(() => {
    if (!project.frames || project.frames.length === 0) return;
    
    dispatch({
      type: TYPES.SET_PROCESSED_FRAMES,
      payload: [...project.frames] // Reset back to raw frames
    });
    addToast('Background filters cleared.', 'info');
  }, [project.frames, dispatch, addToast]);

  return { process, resetBackgrounds, isProcessing, progress };
}

export default useBackgroundRemoval;
