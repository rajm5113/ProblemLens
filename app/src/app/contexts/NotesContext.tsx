import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface NoteRecord {
  text: string;
  updatedAt: string;
}

interface NotesContextValue {
  notes: Record<string, NoteRecord>;
  setNote: (id: string, text: string) => void;
  getNote: (id: string) => NoteRecord | undefined;
  deleteNote: (id: string) => void;
  hasNote: (id: string) => boolean;
}

const STORAGE_KEY = "pl_notes";

const NotesContext = createContext<NotesContextValue | null>(null);

function loadNotes(): Record<string, NoteRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, NoteRecord>;
  } catch {
    return {};
  }
}

function saveNotes(notes: Record<string, NoteRecord>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore quota or storage errors.
  }
}

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Record<string, NoteRecord>>(loadNotes);

  const setNote = useCallback((id: string, text: string) => {
    setNotes((prev) => {
      const trimmed = text.trim();
      const next = { ...prev };
      if (!trimmed) {
        delete next[id];
      } else {
        next[id] = { text, updatedAt: new Date().toISOString() };
      }
      saveNotes(next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      saveNotes(next);
      return next;
    });
  }, []);

  const getNote = useCallback((id: string) => notes[id], [notes]);
  const hasNote = useCallback((id: string) => Boolean(notes[id]?.text.trim()), [notes]);

  const value = useMemo(
    () => ({ notes, setNote, getNote, deleteNote, hasNote }),
    [deleteNote, getNote, hasNote, notes, setNote]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) throw new Error("useNotes must be used within <NotesProvider>");
  return context;
}
