import { useRef, useCallback } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { submitGeneration, checkOperation, downloadVideo } from '../services/veo';
import { useToast } from '../components/Toast';

export function useVeoGeneration() {
  const { apiKey } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  
  const pollingIntervalRef = useRef(null);

  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const generate = useCallback(async (prompt, referenceImage = null) => {
    if (!apiKey) {
      addToast('No API Key configured. Please go to Settings to add one.', 'error');
      return;
    }

    cleanup();

    dispatch({
      type: TYPES.UPDATE_GENERATION,
      payload: { status: 'submitting', error: null, progress: 10 }
    });

    try {
      addToast('Submitting request to Veo API...', 'info');
      
      // Submit video request
      // We will strip the base64 prefix if referenceImage exists
      let imgBytes = null;
      if (referenceImage && referenceImage.includes(',')) {
        imgBytes = referenceImage.split(',')[1];
      }

      const operation = await submitGeneration(apiKey, {
        prompt,
        referenceImage: imgBytes,
        model: 'veo-2.0-generate-001' // Default model
      });

      dispatch({
        type: TYPES.UPDATE_GENERATION,
        payload: {
          status: 'polling',
          operationId: operation.name,
          progress: 30
        }
      });

      addToast('Request accepted. Generating video (this can take 1-2 min)...', 'info');

      // Start polling status
      let pollCount = 0;
      pollingIntervalRef.current = setInterval(async () => {
        try {
          pollCount++;
          // Estimate progress up to 90%
          const estimatedProgress = Math.min(30 + pollCount * 5, 90);
          
          dispatch({
            type: TYPES.UPDATE_GENERATION,
            payload: { progress: estimatedProgress }
          });

          const status = await checkOperation(apiKey, operation);

          if (status.done) {
            cleanup();

            if (status.error) {
              throw new Error(status.error.message || 'Veo generation failed.');
            }

            // Retrieve URI from response
            const videoUri = status.response?.generatedVideos?.[0]?.video?.uri;
            if (!videoUri) {
              throw new Error('No video URI returned in the completed response.');
            }

            // Next step: Download video bytes
            dispatch({
              type: TYPES.UPDATE_GENERATION,
              payload: { status: 'downloading', progress: 95 }
            });
            
            addToast('Video generated! Downloading video file...', 'info');
            const videoBlob = await downloadVideo(apiKey, videoUri);
            const videoUrl = URL.createObjectURL(videoBlob);

            // Store in project state
            dispatch({
              type: TYPES.SET_VIDEO,
              payload: {
                video: videoBlob,
                videoUrl: videoUrl
              }
            });

            dispatch({
              type: TYPES.UPDATE_GENERATION,
              payload: { status: 'complete', progress: 100 }
            });

            addToast('Download complete! Video is loaded in Editor.', 'success');
          }
        } catch (pollErr) {
          cleanup();
          console.error('Error polling operation:', pollErr);
          dispatch({
            type: TYPES.UPDATE_GENERATION,
            payload: { status: 'error', error: pollErr.message || 'Polling failed.' }
          });
          addToast(`Generation error: ${pollErr.message}`, 'error');
        }
      }, 7000); // Poll every 7 seconds

    } catch (error) {
      cleanup();
      console.error('Generation submission error:', error);
      dispatch({
        type: TYPES.UPDATE_GENERATION,
        payload: { status: 'error', error: error.message || 'Submission failed.' }
      });
      addToast(`Submission failed: ${error.message}`, 'error');
    }
  }, [apiKey, dispatch, cleanup, addToast]);

  const reset = useCallback(() => {
    cleanup();
    dispatch({
      type: TYPES.UPDATE_GENERATION,
      payload: { status: 'idle', error: null, operationId: null, progress: 0 }
    });
  }, [dispatch, cleanup]);

  return { generate, reset, cleanup };
}
export default useVeoGeneration;
