import { useEffect } from 'react';
import { getSession } from './api';
import { useAppStore } from './store';
import Welcome from './components/Welcome';
import Workspace from './components/Workspace';

export default function App() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);

  useEffect(() => {
    if (session) return;
    const lastSessionId = window.localStorage.getItem('reqflow:lastSessionId');
    if (!lastSessionId) return;

    getSession(lastSessionId)
      .then(setSession)
      .catch(() => window.localStorage.removeItem('reqflow:lastSessionId'));
  }, [session, setSession]);

  return (
    <div className="h-screen min-h-0 overflow-hidden flex flex-col bg-[#080b10]">
      {!session ? <Welcome /> : <Workspace />}
    </div>
  );
}
