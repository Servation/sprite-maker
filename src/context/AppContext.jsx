import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create contexts
const AppStateContext = createContext(null);
const AppDispatchContext = createContext(null);

// LocalStorage key names
const KEY_API_KEY = 'sprite_maker_gemini_api_key';
const KEY_EDITOR_CONFIG = 'sprite_maker_editor_config';
const KEY_LOCAL_LLM_CONFIG = 'sprite_maker_local_llm_config';
const KEY_RENDERING_CONFIG = 'sprite_maker_rendering_config';

// LocalStorage helpers
const getStoredApiKey = () => localStorage.getItem(KEY_API_KEY) || '';
const setStoredApiKey = (key) => localStorage.setItem(KEY_API_KEY, key);

const getStoredEditorConfig = () => {
  const data = localStorage.getItem(KEY_EDITOR_CONFIG);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const getStoredLocalLlmConfig = () => {
  const data = localStorage.getItem(KEY_LOCAL_LLM_CONFIG);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const getStoredRenderingConfig = () => {
  const data = localStorage.getItem(KEY_RENDERING_CONFIG);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Default Configurations
const defaultEditor = {
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
  colorQuantization: {
    enabled: false,
    mode: 'custom', // 'custom' | 'nes' | 'gameboy' | 'pico8' | 'genesis'
    colors: 16,     // 2 to 256
    dither: false   // Ordered Bayer dithering
  }
};

const defaultLocalLlm = {
  enabled: false,
  serverUrl: 'http://localhost:1234',
  model: '',
  models: [],
  isEnhancing: false
};

const defaultRendering = {
  backend: 'veo', // 'veo' | 'comfyui' | 'automatic1111'
  localUrl: 'http://localhost:8188',
  comfyWorkflow: null
};

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
  editor: { ...defaultEditor, ...getStoredEditorConfig() },
  localLlm: { ...defaultLocalLlm, ...getStoredLocalLlmConfig() },
  rendering: { ...defaultRendering, ...getStoredRenderingConfig() },
  session: {
    status: 'idle',        // 'idle' | 'restoring' | 'success' | 'fail'
    error: null
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
  RESTORE_SESSION_START: 'RESTORE_SESSION_START',
  RESTORE_SESSION_SUCCESS: 'RESTORE_SESSION_SUCCESS',
  RESTORE_SESSION_FAIL: 'RESTORE_SESSION_FAIL',
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
          processedFrames: [...action.payload],
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
      
    case TYPES.UPDATE_EDITOR: {
      const nextEditor = { ...state.editor, ...action.payload };
      localStorage.setItem(KEY_EDITOR_CONFIG, JSON.stringify(nextEditor));
      return {
        ...state,
        editor: nextEditor
      };
    }
      
    case TYPES.UPDATE_LOCAL_LLM: {
      const nextLlm = { ...state.localLlm, ...action.payload };
      localStorage.setItem(KEY_LOCAL_LLM_CONFIG, JSON.stringify(nextLlm));
      return {
        ...state,
        localLlm: nextLlm
      };
    }
      
    case TYPES.UPDATE_RENDERING: {
      const nextRendering = { ...state.rendering, ...action.payload };
      localStorage.setItem(KEY_RENDERING_CONFIG, JSON.stringify(nextRendering));
      return {
        ...state,
        rendering: nextRendering
      };
    }
      
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
      
      const [movedFrame] = frames.splice(sourceIdx, 1);
      frames.splice(destIdx, 0, movedFrame);
      
      const [movedProcessed] = processed.splice(sourceIdx, 1);
      processed.splice(destIdx, 0, movedProcessed);
      
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
    
    case TYPES.RESET_PROJECT: {
      const { clearMedia = true, clearSettings = false } = action.payload || {};
      
      if (clearMedia && state.project.videoUrl) {
        URL.revokeObjectURL(state.project.videoUrl);
      }
      
      let nextEditor = state.editor;
      let nextLlm = state.localLlm;
      let nextRendering = state.rendering;
      let nextApiKey = state.apiKey;
      
      if (clearSettings) {
        localStorage.removeItem(KEY_EDITOR_CONFIG);
        localStorage.removeItem(KEY_LOCAL_LLM_CONFIG);
        localStorage.removeItem(KEY_RENDERING_CONFIG);
        localStorage.removeItem(KEY_API_KEY);
        nextEditor = { ...defaultEditor };
        nextLlm = { ...defaultLocalLlm };
        nextRendering = { ...defaultRendering };
        nextApiKey = '';
      }
      
      return {
        ...state,
        apiKey: nextApiKey,
        project: clearMedia ? {
          video: null,
          videoUrl: null,
          frames: [],
          processedFrames: [],
          spriteSheet: null,
        } : state.project,
        generation: clearMedia ? {
          status: 'idle',
          operationId: null,
          error: null,
          progress: 0,
        } : state.generation,
        editor: {
          ...nextEditor,
          selectedFrameIndex: clearMedia ? null : nextEditor.selectedFrameIndex,
        },
        localLlm: nextLlm,
        rendering: nextRendering
      };
    }

    case TYPES.RESTORE_SESSION_START:
      return {
        ...state,
        session: {
          status: 'restoring',
          error: null
        }
      };

    case TYPES.RESTORE_SESSION_SUCCESS: {
      const { video, videoUrl, frames, processedFrames } = action.payload;
      return {
        ...state,
        project: {
          ...state.project,
          video,
          videoUrl,
          frames,
          processedFrames,
          spriteSheet: null
        },
        editor: {
          ...state.editor,
          selectedFrameIndex: frames.length > 0 ? 0 : null
        },
        session: {
          status: 'success',
          error: null
        }
      };
    }

    case TYPES.RESTORE_SESSION_FAIL:
      return {
        ...state,
        session: {
          status: 'fail',
          error: action.payload
        }
      };
      
    default:
      return state;
  }
}

// App State Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  useEffect(() => {
    return () => {
      if (state.project.videoUrl) {
        URL.revokeObjectURL(state.project.videoUrl);
      }
    };
  }, []);
  
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
