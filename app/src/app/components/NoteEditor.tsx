import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, FileText, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useNotes } from "../contexts/NotesContext";
import { useTheme } from "../contexts/ThemeContext";

interface NoteEditorProps {
  problemId: string;
}

export function NoteEditor({ problemId }: NoteEditorProps) {
  const { C } = useTheme();
  const { getNote, setNote } = useNotes();
  const note = getNote(problemId);
  const [expanded, setExpanded] = useState(Boolean(note?.text.trim()));
  const [text, setText] = useState(note?.text ?? "");
  const [justSaved, setJustSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(note?.text ?? "");
    setExpanded(Boolean(note?.text.trim()));
    setJustSaved(false);
  }, [note?.text, problemId]);

  useEffect(() => {
    if (!expanded) return;
    autoSize();
  }, [expanded, text]);

  const autoSize = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.max(72, element.scrollHeight)}px`;
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (trimmed === (note?.text.trim() ?? "")) {
      if (!trimmed) setExpanded(false);
      return;
    }

    setNote(problemId, text);
    setJustSaved(true);
    if (!trimmed) setExpanded(false);

    window.setTimeout(() => setJustSaved(false), 1800);
  };

  return (
    <div
      style={{
        backgroundColor: C.scoreCardBg,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: expanded ? "12px" : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={16} color={C.textDim} />
          <span style={{ color: C.textPrimary, fontSize: "15px", fontWeight: 600 }}>My Notes</span>
        </div>

        {!expanded && (
          <button
            onClick={() => {
              setExpanded(true);
              window.setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            aria-label="Add a note"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "999px",
              border: `1px solid ${C.borderDefault}`,
              backgroundColor: "transparent",
              color: C.textDim,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {expanded ? (
        <>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={handleBlur}
            placeholder="Add your notes about this problem..."
            style={{
              width: "100%",
              minHeight: "72px",
              resize: "none",
              overflow: "hidden",
              background: "transparent",
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: "12px",
              padding: "12px",
              color: C.textPrimary,
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              lineHeight: 1.5,
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "10px",
              gap: "12px",
            }}
          >
            <span style={{ color: C.textFaint, fontSize: "12px" }}>
              {note?.updatedAt
                ? `Last saved ${formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}`
                : "Auto-saves when you leave the field"}
            </span>
            <motion.div
              initial={false}
              animate={{ opacity: justSaved ? 1 : 0, y: justSaved ? 0 : 4 }}
              transition={{ duration: 0.18 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: C.accent,
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <Check size={14} />
              <span>Saved</span>
            </motion.div>
          </div>
        </>
      ) : (
        <p style={{ color: C.textDim, fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
          Keep quick thoughts, interview angles, or startup ideas attached to this problem.
        </p>
      )}
    </div>
  );
}
