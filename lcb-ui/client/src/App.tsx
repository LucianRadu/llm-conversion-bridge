import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, ReactNode, useState } from 'react';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import UncommittedChangesWarning from './components/UncommittedChangesWarning';
import LcbServersPage from './pages/LcbServersPage';
import ActionsPage from './pages/ActionsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ReviewChangesPage from './pages/ReviewChangesPage';
import { useConnectedServer } from './hooks/useConnectedServer';
import { apiClient } from './services/api';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const connectedServer = useConnectedServer();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for initial server load before checking connection
    const checkConnection = async () => {
      try {
        await apiClient.getServers();
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    // Only redirect after we've loaded and confirmed no server is connected
    if (!isLoading && !connectedServer && location.pathname !== '/lcbs') {
      console.log('[ProtectedRoute] No server connected, redirecting to /lcbs');
      navigate('/lcbs', { replace: true });
    }
  }, [isLoading, connectedServer, location.pathname, navigate]);

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
      <TopBar />
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, marginTop: '56px' }}>
        <Sidebar />
        <div
          className={style({
            backgroundColor: 'layer-1',
            paddingX: 4,
            paddingTop: 4,
            width: 'full',
            overflow: 'hidden',
            boxSizing: 'border-box',
            height: '[calc(100vh - 56px)]',
          })}
        >
          <div
            className={style({
              display: 'flex',
              flexDirection: 'column',
              borderTopRadius: 'xl',
              boxShadow: 'emphasized',
              backgroundColor: 'base',
              height: 'full',
              overflow: 'hidden',
              isolation: 'isolate',
              position: 'relative',
            })}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/lcbs" replace />} />
                <Route path="/lcbs" element={<LcbServersPage />} />
                <Route path="/actions" element={<ProtectedRoute><ActionsPage /></ProtectedRoute>} />
                <Route path="/review-changes" element={<ProtectedRoute><ReviewChangesPage /></ProtectedRoute>} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
              </Routes>
            </div>
            <UncommittedChangesWarning />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
