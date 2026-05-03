import { create } from 'zustand';
import type { Session, Stage, DocTab, ChatMessage } from './types';

function readStoredActor() {
  return window.localStorage.getItem('reqflow:actor') || 'local-user';
}

function readStoredWorkspace() {
  return window.localStorage.getItem('reqflow:workspace') || 'default';
}

function readStoredRole() {
  return window.localStorage.getItem('reqflow:role') || 'admin';
}

interface AppState {
  session: Session | null;
  docTab: DocTab;
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;
  actor: string;
  workspaceId: string;
  role: string;

  setSession: (session: Session | null) => void;
  setDocTab: (tab: DocTab) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setActor: (actor: string) => void;
  setWorkspaceId: (workspaceId: string) => void;
  setRole: (role: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateStage: (stage: Stage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  docTab: 'requirement',
  streamingContent: '',
  isStreaming: false,
  error: null,
  actor: readStoredActor(),
  workspaceId: readStoredWorkspace(),
  role: readStoredRole(),

  setSession: (session) => {
    if (session) {
      window.localStorage.setItem('reqflow:lastSessionId', session.id);
    } else {
      window.localStorage.removeItem('reqflow:lastSessionId');
    }
    set({ session });
  },
  setDocTab: (docTab) => set({ docTab }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  setActor: (actor) => {
    const normalized = actor.trim() || 'local-user';
    window.localStorage.setItem('reqflow:actor', normalized);
    set({ actor: normalized });
  },
  setWorkspaceId: (workspaceId) => {
    const normalized = workspaceId.trim() || 'default';
    window.localStorage.setItem('reqflow:workspace', normalized);
    set({ workspaceId: normalized });
  },
  setRole: (role) => {
    const normalized = role.trim() || 'admin';
    window.localStorage.setItem('reqflow:role', normalized);
    set({ role: normalized });
  },
  addMessage: (msg) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            messages: [...state.session.messages, msg],
          }
        : null,
    })),
  updateStage: (stage) =>
    set((state) => ({
      session: state.session ? { ...state.session, stage } : null,
    })),
}));
