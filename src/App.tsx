import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { BootScreen } from './components/BootScreen';
import { StorageNotice } from './components/StorageNotice';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { primeSpeech } from './services/speech';
import { primeSound } from './services/sound';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { MapPage } from './pages/MapPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PKPage } from './pages/PKPage';
import { PlayPage } from './pages/PlayPage';
import { ResultPage } from './pages/ResultPage';
import { SettingsPage } from './pages/SettingsPage';
import { WrongBookPage } from './pages/WrongBookPage';

export default function App() {
  const { ready, backend, error } = useAppBootstrap();

  // iOS / Safari：在首次用户手势内解锁语音合成
  useEffect(() => {
    function handleFirstGesture() {
      primeSpeech();
      primeSound();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    }

    window.addEventListener('pointerdown', handleFirstGesture, {
      passive: true,
    });
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  if (!ready) {
    return <BootScreen error={error} />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell>
        <StorageNotice backend={backend} error={error} />
        <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/play/:levelId" element={<PlayPage />} />
            <Route path="/result/:levelId" element={<ResultPage />} />
            <Route path="/wrongbook" element={<WrongBookPage />} />
            <Route
              path="/leaderboard"
              element={<LeaderboardPage />}
            />
            <Route path="/pk" element={<PKPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppErrorBoundary>
      </AppShell>
    </BrowserRouter>
  );
}
