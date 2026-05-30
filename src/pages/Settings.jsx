import { useState } from 'react';
import { useAppState, useAppDispatch, TYPES } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { GoogleGenAI } from '@google/genai';
import { fetchLocalModels } from '../services/lm-studio';
import DragDrop from '../components/DragDrop';

function Settings() {
  const { apiKey, localLlm, rendering } = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  // Gemini API States
  const [inputKey, setInputKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // LM Studio States
  const [llmEnabled, setLlmEnabled] = useState(localLlm.enabled);
  const [llmUrl, setLlmUrl] = useState(localLlm.serverUrl);
  const [llmApiKey, setLlmApiKey] = useState(localLlm.apiKey || '');
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localLlm.model);
  const [modelList, setModelList] = useState(localLlm.models || []);
  const [isQueryingLlm, setIsQueryingLlm] = useState(false);

  // Local Rendering States
  const [activeBackend, setActiveBackend] = useState(rendering.backend);
  const [localRenderUrl, setLocalRenderUrl] = useState(rendering.localUrl);
  const [workflowName, setWorkflowName] = useState(rendering.comfyWorkflow ? 'custom_workflow.json' : '');

  // Save Gemini Key
  const handleSaveKey = (e) => {
    e.preventDefault();
    dispatch({ type: TYPES.SET_API_KEY, payload: inputKey.trim() });
    addToast('API Key saved successfully!', 'success');
  };

  // Test Gemini Key
  const handleTestConnection = async () => {
    if (!inputKey.trim()) {
      addToast('Please enter an API Key to test.', 'warning');
      return;
    }
    setIsTesting(true);
    addToast('Testing connection to Gemini API...', 'info');
    try {
      const ai = new GoogleGenAI({ apiKey: inputKey.trim() });
      await ai.models.list();
      addToast('API Key verified! Connection successful.', 'success');
    } catch (error) {
      console.error(error);
      addToast(`Connection failed: ${error.message || 'Check your key.'}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Save Local LLM settings
  const handleSaveLlmSettings = (e) => {
    e.preventDefault();
    dispatch({
      type: TYPES.UPDATE_LOCAL_LLM,
      payload: {
        enabled: llmEnabled,
        serverUrl: llmUrl.trim(),
        apiKey: llmApiKey.trim(),
        model: selectedModel,
        models: modelList
      }
    });
    addToast('LM Studio settings saved!', 'success');
  };

  // Query models from LM Studio
  const handleQueryLlmModels = async () => {
    if (!llmUrl.trim()) {
      addToast('Please enter an LM Studio server URL.', 'warning');
      return;
    }
    setIsQueryingLlm(true);
    addToast('Querying active models from LM Studio...', 'info');
    try {
      const models = await fetchLocalModels(llmUrl.trim(), llmApiKey.trim());
      setModelList(models);
      if (models.length > 0) {
        setSelectedModel(models[0]);
        addToast(`Found ${models.length} active models!`, 'success');
      } else {
        addToast('No models active. Start a model in LM Studio first.', 'warning');
      }
    } catch {
      addToast('Connection failed. Make sure LM Studio is running and CORS is enabled.', 'error');
    } finally {
      setIsQueryingLlm(false);
    }
  };

  // Save Rendering Backend Settings
  const handleSaveRenderingSettings = (e) => {
    e.preventDefault();
    dispatch({
      type: TYPES.UPDATE_RENDERING,
      payload: {
        backend: activeBackend,
        localUrl: localRenderUrl.trim()
      }
    });
    addToast('Rendering backend settings saved!', 'success');
  };

  // Handle custom ComfyUI JSON upload
  const handleWorkflowUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        dispatch({
          type: TYPES.UPDATE_RENDERING,
          payload: { comfyWorkflow: json }
        });
        setWorkflowName(file.name);
        addToast('Custom ComfyUI API workflow loaded!', 'success');
      } catch {
        addToast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearWorkflow = () => {
    dispatch({
      type: TYPES.UPDATE_RENDERING,
      payload: { comfyWorkflow: null }
    });
    setWorkflowName('');
    addToast('Custom workflow cleared. Using default template.', 'info');
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '8px' }}>Integrations & Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Configure API credentials, local assistant models, and graphics render engines.
        </p>
      </div>

      {/* Grid: Settings Columns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Card 1: Gemini API */}
        <div className="card glass">
          <h2 className="card-title" style={{ color: 'var(--primary)' }}>
            ☁️ Cloud Services (Google Gen AI)
          </h2>
          <form onSubmit={handleSaveKey}>
            <div className="form-group">
              <label className="form-label" htmlFor="apiKeyInput">Gemini API Key</label>
              <div className="input-password-wrapper">
                <input
                  id="apiKeyInput"
                  type={showKey ? 'text' : 'password'}
                  className="input font-mono"
                  placeholder="AIzaSy..."
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="input-toggle-btn"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                Exchanges data directly with Google's API endpoints. Stored locally.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                Save Key
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{ flexGrow: 1 }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Local AI Prompt Assistant (LM Studio) */}
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="card-title" style={{ margin: 0, color: 'var(--accent)' }}>
              🪄 Local Prompt Helper (LM Studio)
            </h2>
            <label className="toggle-switch">
              <input
                type="checkbox"
                className="toggle-switch-input"
                checked={llmEnabled}
                onChange={(e) => setLlmEnabled(e.target.checked)}
              />
              <span className="toggle-switch-slider" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable Helper</span>
            </label>
          </div>

          {llmEnabled && (
            <form onSubmit={handleSaveLlmSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">LM Studio Server URL</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={llmUrl}
                  onChange={(e) => setLlmUrl(e.target.value)}
                  placeholder="http://localhost:1234"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">API Key (Optional / For Proxies or Cloud)</label>
                <div className="input-password-wrapper">
                  <input
                    type={showLlmKey ? 'text' : 'password'}
                    className="input font-mono"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder="Enter helper API Key if required..."
                    style={{ paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    className="input-toggle-btn"
                    onClick={() => setShowLlmKey(!showLlmKey)}
                  >
                    {showLlmKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Active Assistant Model</label>
                  <select
                    className="input"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={modelList.length === 0}
                  >
                    {modelList.length === 0 ? (
                      <option value="">No models loaded. Click Query.</option>
                    ) : (
                      modelList.map(id => <option key={id} value={id}>{id}</option>)
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleQueryLlmModels}
                  disabled={isQueryingLlm}
                  style={{ height: '42px', padding: '0 16px' }}
                >
                  {isQueryingLlm ? 'Querying...' : 'Query Models'}
                </button>
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>How to Enable CORS:</strong> Open LM Studio &gt; navigate to the <strong>Developer / Server tab</strong> in the sidebar &gt; scroll to Server Settings &gt; toggle <strong>Enable CORS</strong> to ON. Start your local server.
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                Save Helper Settings
              </button>
            </form>
          )}
        </div>

        {/* Card 3: Local Render Backend (ComfyUI / A1111) */}
        <div className="card glass">
          <h2 className="card-title" style={{ color: 'var(--success)' }}>
            💻 Local Graphics Rendering Engine
          </h2>
          <form onSubmit={handleSaveRenderingSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              
              {/* Backend select */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Generative Backend</label>
                <select
                  className="input"
                  value={activeBackend}
                  onChange={(e) => {
                    setActiveBackend(e.target.value);
                    if (e.target.value === 'comfyui') setLocalRenderUrl('http://localhost:8188');
                    if (e.target.value === 'automatic1111') setLocalRenderUrl('http://localhost:7860');
                  }}
                >
                  <option value="veo">Google Veo (Cloud API)</option>
                  <option value="comfyui">ComfyUI (Local Offline)</option>
                  <option value="automatic1111">Automatic1111 (Local Offline)</option>
                </select>
              </div>

              {/* Server URL */}
              {activeBackend !== 'veo' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Local Server Address</label>
                  <input
                    type="text"
                    className="input font-mono"
                    value={localRenderUrl}
                    onChange={(e) => setLocalRenderUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* ComfyUI custom workflow upload */}
            {activeBackend === 'comfyui' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="form-label">Custom ComfyUI API Workflow Template (Optional)</label>
                {!workflowName ? (
                  <DragDrop
                    accept=".json"
                    onFile={handleWorkflowUpload}
                    label="Drop ComfyUI API Format JSON here or click to browse"
                    icon="⚙️"
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <span className="font-mono text-sm" style={{ color: 'var(--success)' }}>✓ {workflowName}</span>
                    <button type="button" className="btn btn-ghost text-xs" onClick={handleClearWorkflow} style={{ padding: '4px 8px' }}>
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  By default, the app uses a standard Text-to-Video LTX workflow. Uploading custom JSON requires enabling "Dev Mode Options" in ComfyUI Settings, and saving via "Save (API Format)".
                </p>
              </div>
            )}

            {/* Launch Instructions */}
            {activeBackend === 'automatic1111' && (
              <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <strong>Required Launch Flags:</strong> To connect from the browser, start Automatic1111 using API and CORS flags:
                <code className="font-mono" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', marginTop: '6px', color: 'var(--accent)' }}>
                  webui-user.bat --api --cors-allow-origin=*
                </code>
              </div>
            )}

            {activeBackend !== 'veo' && (
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                Save Render Settings
              </button>
            )}
          </form>
        </div>

        {/* Security / Info footer card */}
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', backgroundColor: 'rgba(234, 179, 8, 0.02)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔒 Local Data Security
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            All integrations (keys, local model ports, and workflows) remain strictly inside your browser environment. No telemetry is collected. Direct network socket queries will only reach endpoints running on your own machine.
          </p>
        </div>

      </div>
    </div>
  );
}

export default Settings;
