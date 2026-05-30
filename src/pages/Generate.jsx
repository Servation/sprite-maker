import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { useVeoGeneration } from '../hooks/useVeoGeneration';
import { useLocalRender } from '../hooks/useLocalRender';
import { enhancePrompt } from '../services/lm-studio';
import DragDrop from '../components/DragDrop';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

function Generate() {
  const navigate = useNavigate();
  const { apiKey, generation, project, localLlm, rendering } = useAppState();
  const dispatch = useAppDispatch();
  const { generate, reset: resetVeo, cleanup: cleanupVeo } = useVeoGeneration();
  const { generateLocal, resetLocal, cleanupLocal } = useLocalRender();
  const { addToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState(null); // File
  const [refImageUrl, setRefImageUrl] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Clean up polling and WebSockets on unmount
  useEffect(() => {
    return () => {
      cleanupVeo();
      cleanupLocal();
    };
  }, [cleanupVeo, cleanupLocal]);

  const handleRefImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setRefImageUrl(e.target.result);
      setRefImage(file);
      addToast('Reference image loaded.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleClearRefImage = (e) => {
    e.stopPropagation();
    setRefImage(null);
    setRefImageUrl('');
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    dispatch({ type: TYPES.UPDATE_LOCAL_LLM, payload: { isEnhancing: true } });
    addToast('Enhancing prompt with local LLM...', 'info');
    try {
      const enhanced = await enhancePrompt(localLlm.serverUrl, localLlm.model, prompt.trim(), localLlm.apiKey);
      setPrompt(enhanced);
      addToast('Prompt enhanced successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast(`Enhancement failed: ${err.message || 'Check LM Studio connection.'}`, 'error');
    } finally {
      dispatch({ type: TYPES.UPDATE_LOCAL_LLM, payload: { isEnhancing: false } });
    }
  };

  const handleGenerateClick = (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      addToast('Please enter a description prompt.', 'warning');
      return;
    }
    if (rendering.backend === 'veo' && !apiKey) {
      addToast('No API Key configured. Please go to Settings to add one.', 'error');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmGeneration = () => {
    setIsConfirmOpen(false);
    if (rendering.backend === 'veo') {
      generate(prompt.trim(), refImageUrl || null);
    } else {
      generateLocal(prompt.trim());
    }
  };

  const handleContinue = () => {
    if (project.videoUrl) {
      addToast('Opening Editor workspace...', 'success');
      navigate('/editor');
    }
  };

  const handleResetWorkflow = () => {
    resetVeo();
    resetLocal();
    setPrompt('');
    setRefImage(null);
    setRefImageUrl('');
  };

  const isGenerating = ['submitting', 'polling', 'downloading'].includes(generation.status);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
          {rendering.backend === 'veo' ? 'AI Video Generation' : 'Local AI Generation'}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {rendering.backend === 'veo'
            ? 'Create a temporally consistent, looping sprite animation clip using Google Veo 3.1.'
            : `Create sprite frame inputs using local ${rendering.backend === 'comfyui' ? 'ComfyUI' : 'Automatic1111'} server.`}
        </p>
      </div>

      <div className="grid-2">
        {/* Left Column - Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card glass">
            <h2 className="card-title">1. Describe the Animation</h2>
            <form onSubmit={handleGenerateClick}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" htmlFor="promptInput" style={{ marginBottom: 0 }}>Action Prompt</label>
                  {localLlm.enabled && (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={handleEnhancePrompt}
                      disabled={localLlm.isEnhancing || isGenerating || !prompt.trim()}
                    >
                      {localLlm.isEnhancing ? '🪄 Enhancing...' : '🪄 Enhance Prompt'}
                    </button>
                  )}
                </div>
                <textarea
                  id="promptInput"
                  className="input"
                  placeholder="e.g. A tiny pixel art knight running right, high quality, flat design"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating || localLlm.isEnhancing}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <span className="form-label">Chroma Key Optimization (Auto-applied)</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  The app automatically appends solid green screen instructions to your prompt to facilitate automatic background removal.
                </p>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isGenerating || localLlm.isEnhancing || !prompt.trim()}
              >
                Generate Animation
              </button>
            </form>
          </div>

          <div className="card glass">
            <h2 className="card-title">2. Character Reference (Optional)</h2>
            {rendering.backend === 'veo' ? (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                  Upload a reference image (concept art, front pose, or sheet) to help the model maintain character consistency.
                </p>
                
                {!refImageUrl ? (
                  <DragDrop
                    accept="image/*"
                    onFile={handleRefImageFile}
                    label="Drop reference image here or browse"
                    icon="🖼️"
                  />
                ) : (
                  <div style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img
                      src={refImageUrl}
                      alt="Reference Thumbnail"
                      style={{ width: '64px', height: '64px', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#1a1a1a' }}
                    />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <p className="text-sm truncate" style={{ fontWeight: 500 }}>{refImage?.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Image loaded</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleClearRefImage}
                      style={{ padding: '6px 12px' }}
                      disabled={isGenerating}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                  ⚠️ Reference image guidance is optimized for Google Veo. Switch to Veo backend in Settings to use image guides.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status & Preview */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', position: 'relative' }}>
          
          {generation.status === 'idle' && !project.videoUrl && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔮</div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '8px' }}>Waiting for Request</h3>
              <p className="text-xs" style={{ maxWidth: '280px', margin: '0 auto', lineHeight: '1.5' }}>
                Describe your animation loop and click "Generate" to start the AI generation process.
              </p>
            </div>
          )}

          {isGenerating && (
            <div style={{ width: '85%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '2.5rem', animation: 'shimmer 1.5s infinite linear' }}>⚡</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {generation.status === 'submitting' && (rendering.backend === 'veo' ? 'Submitting prompt to Veo...' : 'Submitting to local server...')}
                {generation.status === 'polling' && (rendering.backend === 'veo' ? 'AI is rendering your video...' : 'Local GPU is rendering asset...')}
                {generation.status === 'downloading' && 'Downloading generated media...'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {generation.status === 'polling' && (rendering.backend === 'veo' 
                  ? 'This takes about 1-2 minutes. The operation is polled in the background.'
                  : 'Your local server is processing. Check console for status updates.')}
                {generation.status === 'downloading' && 'Fetching files from generative server...'}
              </p>
              <ProgressBar value={generation.progress} label="Generation Progress" />
            </div>
          )}

          {generation.status === 'error' && (
            <div style={{ width: '85%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '3rem', color: 'var(--error)' }}>⚠️</div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Generation Failed</h3>
              <p className="text-sm" style={{ color: 'var(--error)', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {generation.error || 'An unexpected error occurred during rendering.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
                <button className="btn btn-secondary text-sm" onClick={handleResetWorkflow}>
                  Reset Form
                </button>
              </div>
            </div>
          )}

          {generation.status === 'complete' && project.videoUrl && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}>Generation Succeeded!</h3>
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', aspectRatio: '1/1', flexGrow: 1, display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
                {project.video && project.video.type && project.video.type.startsWith('image/') ? (
                  <img
                    src={project.videoUrl}
                    alt="Generated Sprite Sheet"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <video
                    src={project.videoUrl}
                    controls
                    loop
                    autoPlay
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="btn btn-secondary text-sm" onClick={handleResetWorkflow} style={{ flexGrow: 1 }}>
                  Generate Another
                </button>
                <button className="btn btn-primary text-sm" onClick={handleContinue} style={{ flexGrow: 2 }}>
                  Continue to Editor →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmGeneration}
        title={rendering.backend === 'veo' ? 'Confirm Video Generation' : 'Confirm Local Generation'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rendering.backend === 'veo' ? (
            <>
              <p>
                You are about to generate a video utilizing the Google Veo API.
              </p>
              <div style={{ padding: '12px', borderLeft: '4px solid var(--warning)', backgroundColor: 'rgba(234, 179, 8, 0.05)', fontSize: '0.85rem' }}>
                <strong>Estimated Cost Warning:</strong> Each video generation query calls high-compute AI models and incurs Google Cloud charges. Make sure your billing accounts are managed.
              </div>
            </>
          ) : (
            <>
              <p>
                You are about to generate asset files utilizing your local <strong>{rendering.backend === 'comfyui' ? 'ComfyUI' : 'Automatic1111'}</strong> server.
              </p>
              <div style={{ padding: '12px', borderLeft: '4px solid var(--success)', backgroundColor: 'rgba(34, 197, 94, 0.05)', fontSize: '0.85rem' }}>
                <strong>Local Server Run:</strong> This runs offline on your machine's hardware. Make sure your local server is active at <code>{rendering.localUrl}</code>.
              </div>
            </>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Selected prompt: "{prompt}"
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default Generate;
