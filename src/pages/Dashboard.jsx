import { Link } from 'react-router-dom';
import { useAppState } from '../context/AppContext';

function Dashboard() {
  const { apiKey } = useAppState();
  const isApiConfigured = !!apiKey;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '40px 0', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(135deg, var(--text-main), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
          Sprite Maker
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Generate fluid, high-fidelity 2D game animations from text prompts using Google Veo 3.1, or import your own video clips. Slice them into game-ready transparent sprite sheets.
        </p>
      </section>

      {/* Main Workflows */}
      <div className="grid-2" style={{ marginBottom: '40px' }}>
        {/* Generate Workflow Card */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '10px' }}>AI Video Generation</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Describe a character action (e.g. "a pixel art knight running on green screen") and let Google's flagship Veo 3.1 model generate a temporally consistent, looping 1:1 animation clip.
            </p>
          </div>
          <Link to="/generate" className="btn btn-primary" style={{ width: '100%' }}>
            Generate Animation
          </Link>
        </div>

        {/* Import Workflow Card */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: 'var(--accent)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '10px' }}>Import Existing Video</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Have a pre-rendered 3D animation, a hand-drawn video clip, or stock footage? Drop your MP4/WebM video directly into the pipeline to extract frame strips and build your sprite sheet.
            </p>
          </div>
          <Link to="/import" className="btn btn-secondary" style={{ width: '100%' }}>
            Upload Video File
          </Link>
        </div>
      </div>

      {/* Setup Checklist */}
      <div className="card glass" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          Quick Setup Status
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: API Key */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 500, color: isAppReady(isApiConfigured) }}>
                1. Configure Gemini API Key
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Required for the AI Video Generation workflow. Keys are saved locally on your device.
              </p>
            </div>
            {isApiConfigured ? (
              <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>Configured</span>
            ) : (
              <Link to="/settings" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Set Up Key</Link>
            )}
          </div>

          {/* Step 2: Model Support */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>
                2. Paid Billing Activation
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Veo video generation requires a paid Google Gen AI billing tier. Make sure your key has billing enabled.
              </p>
            </div>
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Check AI Studio
            </a>
          </div>

          {/* Step 3: Game Integration */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 500 }}>
                3. Sprite Sheet Customizer
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Customize grid dimensions, frame padding, background keys, and animation loop playback rate.
              </p>
            </div>
            <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const isAppReady = (check) => check ? 'var(--text-main)' : 'var(--text-muted)';

export default Dashboard;
