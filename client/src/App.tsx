import { useAppStore } from './store';
import Welcome from './components/Welcome';
import Workspace from './components/Workspace';

export default function App() {
  const session = useAppStore((s) => s.session);

  return (
    <div className="h-screen flex flex-col bg-[#080b10]">
      {!session ? <Welcome /> : <Workspace />}
    </div>
  );
}
