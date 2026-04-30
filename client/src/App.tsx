import { useAppStore } from './store';
import Welcome from './components/Welcome';
import Workspace from './components/Workspace';

export default function App() {
  const session = useAppStore((s) => s.session);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {!session ? <Welcome /> : <Workspace />}
    </div>
  );
}
