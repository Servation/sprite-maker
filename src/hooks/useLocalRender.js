import { useRef, useCallback } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { submitComfyPrompt, submitA1111Prompt } from '../services/local-render';
import { useToast } from '../components/Toast';

export function useLocalRender() {
  const { rendering } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  
  const wsRef = useRef(null);
  const clientIdRef = useRef(null);

  const getClientId = () => {
    if (!clientIdRef.current) {
      clientIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15);
    }
    return clientIdRef.current;
  };

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const generateLocal = useCallback(async (prompt, customWorkflow = null) => {
    cleanup();

    const { backend, localUrl } = rendering;
    const cleanUrl = localUrl.replace(/\/$/, '');

    dispatch({
      type: TYPES.UPDATE_GENERATION,
      payload: { status: 'submitting', error: null, progress: 10 }
    });

    try {
      if (backend === 'automatic1111') {
        addToast('Submitting prompt to Automatic1111...', 'info');
        
        dispatch({
          type: TYPES.UPDATE_GENERATION,
          payload: { status: 'polling', progress: 40 }
        });

        const imageBlob = await submitA1111Prompt(cleanUrl, prompt);
        
        dispatch({
          type: TYPES.UPDATE_GENERATION,
          payload: { status: 'downloading', progress: 90 }
        });

        const videoUrl = URL.createObjectURL(imageBlob);

        dispatch({
          type: TYPES.SET_VIDEO,
          payload: {
            video: imageBlob,
            videoUrl: videoUrl
          }
        });

        dispatch({
          type: TYPES.UPDATE_GENERATION,
          payload: { status: 'complete', progress: 100 }
        });

        addToast('Automatic1111 rendering complete! Loaded image into workspace.', 'success');

      } else if (backend === 'comfyui') {
        const clientId = getClientId();
        addToast('Connecting to ComfyUI WebSocket...', 'info');

        // Setup WebSocket for ComfyUI
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const rawHost = cleanUrl.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${rawHost}/ws?clientId=${clientId}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        let promptId = null;

        ws.onopen = async () => {
          try {
            addToast('WebSocket connected. Submitting prompt workflow...', 'info');
            const data = await submitComfyPrompt(cleanUrl, customWorkflow || rendering.comfyWorkflow, prompt, clientId);
            promptId = data.prompt_id;
            
            dispatch({
              type: TYPES.UPDATE_GENERATION,
              payload: {
                status: 'polling',
                operationId: promptId,
                progress: 20
              }
            });
          } catch (err) {
            console.error('Error submitting prompt to ComfyUI:', err);
            ws.close();
            dispatch({
              type: TYPES.UPDATE_GENERATION,
              payload: { status: 'error', error: err.message || 'ComfyUI submission failed.' }
            });
            addToast(`ComfyUI submission error: ${err.message}`, 'error');
          }
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'status') {
              // Status updates (queue size etc)
            } else if (msg.type === 'executing') {
              const { node, prompt_id } = msg.data;
              if (prompt_id === promptId) {
                if (node === null) {
                  // Execution finished!
                  // Let's poll the history to find the final saved file or let it come through the executed message
                } else {
                  addToast(`Executing node ${node}...`, 'info');
                }
              }
            } else if (msg.type === 'progress') {
              const { value, max, prompt_id } = msg.data;
              if (prompt_id === promptId) {
                const stepPct = Math.round((value / max) * 60) + 20; // scale progress from 20% to 80%
                dispatch({
                  type: TYPES.UPDATE_GENERATION,
                  payload: { progress: stepPct }
                });
              }
            } else if (msg.type === 'executed') {
              const { output, prompt_id } = msg.data;
              if (prompt_id === promptId) {
                // We got the output!
                ws.close();
                
                dispatch({
                  type: TYPES.UPDATE_GENERATION,
                  payload: { status: 'downloading', progress: 90 }
                });

                // Find image or video output
                let outputFilename = '';
                let outputSubfolder = '';
                let outputType = 'output';

                if (output.images && output.images.length > 0) {
                  const outImg = output.images[0];
                  outputFilename = outImg.filename;
                  outputSubfolder = outImg.subfolder || '';
                  outputType = outImg.type || 'output';
                } else if (output.gifs && output.gifs.length > 0) {
                  const outGif = output.gifs[0];
                  outputFilename = outGif.filename;
                  outputSubfolder = outGif.subfolder || '';
                  outputType = outGif.type || 'output';
                }

                if (!outputFilename) {
                  throw new Error('ComfyUI finished executing, but no image or video file path was returned.');
                }

                addToast('Retrieving generated output...', 'info');
                
                const viewUrl = `${cleanUrl}/view?filename=${encodeURIComponent(outputFilename)}&subfolder=${encodeURIComponent(outputSubfolder)}&type=${encodeURIComponent(outputType)}`;
                const fileResponse = await fetch(viewUrl);
                if (!fileResponse.ok) {
                  throw new Error(`Failed to fetch output file: ${fileResponse.statusText}`);
                }

                const fileBlob = await fileResponse.blob();
                const fileUrl = URL.createObjectURL(fileBlob);

                dispatch({
                  type: TYPES.SET_VIDEO,
                  payload: {
                    video: fileBlob,
                    videoUrl: fileUrl
                  }
                });

                dispatch({
                  type: TYPES.UPDATE_GENERATION,
                  payload: { status: 'complete', progress: 100 }
                });

                addToast('ComfyUI rendering complete!', 'success');
              }
            }
          } catch (err) {
            console.error('Error handling WebSocket message:', err);
            ws.close();
            dispatch({
              type: TYPES.UPDATE_GENERATION,
              payload: { status: 'error', error: err.message || 'ComfyUI processing failed.' }
            });
            addToast(`Rendering error: ${err.message}`, 'error');
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          ws.close();
          dispatch({
            type: TYPES.UPDATE_GENERATION,
            payload: { status: 'error', error: 'Failed to connect to local ComfyUI WebSocket.' }
          });
          addToast('ComfyUI WebSocket connection failed. Verify server status and CORS.', 'error');
        };

        ws.onclose = () => {
          cleanup();
        };
      }
    } catch (error) {
      cleanup();
      console.error('Local generation submission error:', error);
      dispatch({
        type: TYPES.UPDATE_GENERATION,
        payload: { status: 'error', error: error.message || 'Local render submission failed.' }
      });
      addToast(`Local render failed: ${error.message}`, 'error');
    }
  }, [rendering, dispatch, cleanup, addToast]);

  const resetLocal = useCallback(() => {
    cleanup();
    dispatch({
      type: TYPES.UPDATE_GENERATION,
      payload: { status: 'idle', error: null, operationId: null, progress: 0 }
    });
  }, [dispatch, cleanup]);

  return { generateLocal, resetLocal, cleanupLocal: cleanup };
}

export default useLocalRender;
