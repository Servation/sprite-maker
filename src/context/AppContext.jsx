/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';

// Create contexts
const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

// LocalStorage helpers
const KEY_API_KEY = 'sprite_maker_gemini_api_key';
const KEY_LLM_API_KEY = 'sprite_maker_llm_api_key';
const getStoredApiKey = () => localStorage.getItem(KEY_API_KEY) || '';
const setStoredApiKey = (key) => localStorage.setItem(KEY_API_KEY, key);
const getStoredLlmApiKey = () => localStorage.getItem(KEY_LLM_API_KEY) || '';
const setStoredLlmApiKey = (key) => localStorage.setItem(KEY_LLM_API_KEY, key);

// Initial State
const initialState = {
  apiKey: getStoredApiKey(),
  project: {
    video: null,           // File or Blob
    videoUrl: null,        // Object URL
    frames: [],            // Array of ImageData objects (raw extracted frames)
    processedFrames: [],   // Array of ImageData objects (after chroma-key bg removal)
    spriteSheet: null,     // Blob of the final sprite sheet
  },
  generation: {
    status: 'idle',        // 'idle' | 'submitting' | 'polling' | 'downloading' | 'complete' | 'error'
    operationId: null,
    error: null,
    progress: 0,           // 0-100
  },
  editor: {
    fps: 10,               // Default 10 FPS
    frameWidth: 64,        // Default 64px width
    frameHeight: 64,       // Default 64px height
    columns: 4,            // Default 4 columns
    padding: 0,            // Default 0 padding
    chromaKey: {
      color: '#00ff00',    // Default green screen color
      tolerance: 30,       // Chroma key tolerance (0-100)
      enabled: false       // Whether background removal is applied
    },
    selectedFrameIndex: null, // Selected frame for detailed view
    perspective: 'single', // 'single' | '2way_mirror' | '4way'
  },
  localLlm: {
    enabled: false,
    serverUrl: 'http://localhost:1234',
    apiKey: getStoredLlmApiKey(),
    model: '',
    models: [],
    isEnhancing: false
  },
  rendering: {
    backend: 'veo', // 'veo' | 'comfyui' | 'automatic1111'
    localUrl: 'http://localhost:8188',
    comfyWorkflow: null
  }
};

// Reducer Action Types
export const TYPES = {
  SET_API_KEY: 'SET_API_KEY',
  SET_VIDEO: 'SET_VIDEO',
  SET_FRAMES: 'SET_FRAMES',
  SET_PROCESSED_FRAMES: 'SET_PROCESSED_FRAMES',
  SET_SPRITE_SHEET: 'SET_SPRITE_SHEET',
  UPDATE_GENERATION: 'UPDATE_GENERATION',
  UPDATE_EDITOR: 'UPDATE_EDITOR',
  UPDATE_LOCAL_LLM: 'UPDATE_LOCAL_LLM',
  UPDATE_RENDERING: 'UPDATE_RENDERING',
  DELETE_FRAME: 'DELETE_FRAME',
  REORDER_FRAMES: 'REORDER_FRAMES',
  RESET_PROJECT: 'RESET_PROJECT',
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case TYPES.SET_API_KEY:
      setStoredApiKey(action.payload);
      return {
        ...state,
        apiKey: action.payload,
      };
      
    case TYPES.SET_VIDEO:
      // Clean up previous URL to avoid memory leak
      if (state.project.videoUrl) {
        URL.revokeObjectURL(state.project.videoUrl);
      }
      return {
        ...state,
        project: {
          ...state.project,
          video: action.payload.video,
          videoUrl: action.payload.videoUrl,
          frames: [],
          processedFrames: [],
          spriteSheet: null,
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: null,
        }
      };
      
    case TYPES.SET_FRAMES:
      return {
        ...state,
        project: {
          ...state.project,
          frames: action.payload,
          processedFrames: [...action.payload], // Init processed frames as copy of raw frames
          spriteSheet: null,
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: action.payload.length > 0 ? 0 : null,
        }
      };
      
    case TYPES.SET_PROCESSED_FRAMES:
      return {
        ...state,
        project: {
          ...state.project,
          processedFrames: action.payload,
          spriteSheet: null,
        }
      };
      
    case TYPES.SET_SPRITE_SHEET:
      return {
        ...state,
        project: {
          ...state.project,
          spriteSheet: action.payload,
        }
      };
      
    case TYPES.UPDATE_GENERATION:
      return {
        ...state,
        generation: {
          ...state.generation,
          ...action.payload,
        }
      };
      
    case TYPES.UPDATE_EDITOR:
      return {
        ...state,
        editor: {
          ...state.editor,
          ...action.payload,
        }
      };
      
    case TYPES.UPDATE_LOCAL_LLM:
      if (action.payload.apiKey !== undefined) {
        setStoredLlmApiKey(action.payload.apiKey);
      }
      return {
        ...state,
        localLlm: {
          ...state.localLlm,
          ...action.payload,
        }
      };
      
    case TYPES.UPDATE_RENDERING:
      return {
        ...state,
        rendering: {
          ...state.rendering,
          ...action.payload,
        }
      };
      
    case TYPES.DELETE_FRAME: {
      const idx = action.payload;
      const newFrames = state.project.frames.filter((_, i) => i !== idx);
      const newProcessed = state.project.processedFrames.filter((_, i) => i !== idx);
      
      let newSelected = state.editor.selectedFrameIndex;
      if (newSelected !== null) {
        if (newFrames.length === 0) {
          newSelected = null;
        } else if (newSelected >= newFrames.length) {
          newSelected = newFrames.length - 1;
        }
      }
      
      return {
        ...state,
        project: {
          ...state.project,
          frames: newFrames,
          processedFrames: newProcessed,
          spriteSheet: null,
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: newSelected,
        }
      };
    }
    
    case TYPES.REORDER_FRAMES: {
      const { sourceIdx, destIdx } = action.payload;
      const frames = [...state.project.frames];
      const processed = [...state.project.processedFrames];
      
      // Move raw frames
      const [movedFrame] = frames.splice(sourceIdx, 1);
      frames.splice(destIdx, 0, movedFrame);
      
      // Move processed frames
      const [movedProcessed] = processed.splice(sourceIdx, 1);
      processed.splice(destIdx, 0, movedProcessed);
      
      // Maintain selection
      let selectedIdx = state.editor.selectedFrameIndex;
      if (selectedIdx === sourceIdx) {
        selectedIdx = destIdx;
      } else if (sourceIdx < selectedIdx && destIdx >= selectedIdx) {
        selectedIdx--;
      } else if (sourceIdx > selectedIdx && destIdx <= selectedIdx) {
        selectedIdx++;
      }
      
      return {
        ...state,
        project: {
          ...state.project,
          frames,
          processedFrames: processed,
          spriteSheet: null,
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: selectedIdx,
        }
      };
    }
    
    case TYPES.RESET_PROJECT:
      if (state.project.videoUrl) {
        URL.revokeObjectURL(state.project.videoUrl);
      }
      return {
        ...state,
        project: {
          video: null,
          videoUrl: null,
          frames: [],
          processedFrames: [],
          spriteSheet: null,
        },
        generation: {
          status: 'idle',
          operationId: null,
          error: null,
          progress: 0,
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: null,
        }
      };
      
    default:
      return state;
  }
}

// App State Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Cleanup object URL on change or unmount
  useEffect(() => {
    return () => {
      if (state.project.videoUrl) {
        URL.revokeObjectURL(state.project.videoUrl);
      }
    };
  }, [state.project.videoUrl]);
  
  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// Helper Hooks
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}
