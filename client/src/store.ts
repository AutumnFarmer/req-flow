import { create } from 'zustand';
import type { Session, Stage, DocTab, ChatMessage } from './types';

interface AppState {
  session: Session | null;
  docTab: DocTab;
  streamingContent: string;
  isStreaming: boolean;
  error: string | null;

  setSession: (session: Session | null) => void;
  setDocTab: (tab: DocTab) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  updateStage: (stage: Stage) => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  docTab: 'requirement',
  streamingContent: '',
  isStreaming: false,
  error: null,

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
