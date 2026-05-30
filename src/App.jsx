import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';

// Pages (will create next)
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Generate from './pages/Generate';
import Import from './pages/Import';
import Editor from './pages/Editor';

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/import" element={<Import />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
