import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppState, useAppDispatch, TYPES } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import { loadSessionMedia } from './services/db';

// Pages
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Generate from './pages/Generate';
import Import from './pages/Import';
import Editor from './pages/Editor';

function AppBootloader({ children }) {
  const { session } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const restoreSession = async () => {
      dispatch({ type: TYPES.RESTORE_SESSION_START });
      try {
        const media = await loadSessionMedia();
        if (media && media.video) {
          const videoUrl = URL.createObjectURL(media.video);
          dispatch({
            type: TYPES.RESTORE_SESSION_SUCCESS,
            payload: {
              video: media.video,
              videoUrl,
              frames: media.frames,
              processedFrames: media.processedFrames
            }
          });
          // Redirect to editor on boot if on the dashboard
          if (location.pathname === '/') {
            navigate('/editor');
          }
        } else {
          dispatch({ type: TYPES.RESTORE_SESSION_FAIL, payload: 'No saved session.' });
        }
      } catch (err) {
        console.error('Failed to restore offline workspace session:', err);
        dispatch({ type: TYPES.RESTORE_SESSION_FAIL, payload: err.message });
      }
    };

    restoreSession();
  }, [dispatch]); // run once on startup

  if (session.status === 'restoring') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        gap: '20px',
        fontFamily: 'var(--font-mono)'
      }}>
        <div style={{
          fontSize: '3rem',
          animation: 'shimmer 1.5s infinite linear'
        }}>
          ⚡
        </div>
        <div style={{ fontWeight: 600, letterSpacing: '1px' }}>
          RESTORING ACTIVE WORKSPACE...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Loading saved video and frame buffers from local database
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <AppBootloader>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/generate" element={<Generate />} />
                <Route path="/import" element={<Import />} />
                <Route path="/editor" element={<Editor />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </AppBootloader>
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
