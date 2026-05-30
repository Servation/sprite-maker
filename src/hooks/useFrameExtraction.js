import { useState, useCallback } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { extractFrames } from '../services/frame-extractor';
import { useToast } from '../components/Toast';

export function useFrameExtraction() {
  const { project, editor } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const extract = useCallback(async () => {
    if (!project.video) {
      addToast('No video file loaded in the workspace.', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    addToast('Starting frame extraction pipeline...', 'info');

    try {
      const frames = await extractFrames(project.video, {
        fps: editor.fps,
        frameWidth: editor.frameWidth,
        frameHeight: editor.frameHeight,
        onProgress: (pct) => setProgress(pct)
      });

      dispatch({
        type: TYPES.SET_FRAMES,
        payload: frames
      });

      addToast(`Successfully extracted ${frames.length} animation frames!`, 'success');
    } catch (error) {
      console.error('Frame extraction failed:', error);
      addToast(`Extraction failed: ${error.message || 'Check your video file.'}`, 'error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [project.video, editor.fps, editor.frameWidth, editor.frameHeight, dispatch, addToast]);

  return { extract, isProcessing, progress };
}

export default useFrameExtraction;
