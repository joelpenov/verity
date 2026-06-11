"use client";

import { useRef, useState, DragEvent } from "react";

interface Props {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTS = [".pdf", ".docx", ".txt", ".md"];
const MAX_BYTES = 50 * 1024 * 1024;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  if (name.endsWith(".pdf"))  return "⬜";
  if (name.endsWith(".docx")) return "⬜";
  if (name.endsWith(".md"))   return "⬜";
  return "⬜";
}

const EXT_BADGE: Record<string, { label: string; color: string }> = {
  ".pdf":  { label: "PDF",  color: "#ef4444" },
  ".docx": { label: "DOCX", color: "#3b82f6" },
  ".txt":  { label: "TXT",  color: "#94a3b8" },
  ".md":   { label: "MD",   color: "#10b981" },
};

function ExtBadge({ name }: { name: string }) {
  const ext = ACCEPTED_EXTS.find(e => name.toLowerCase().endsWith(e)) ?? "";
  const meta = EXT_BADGE[ext] ?? { label: ext.toUpperCase().slice(1), color: "#94a3b8" };
  return (
    <span
      className="text-xs font-bold px-1.5 py-0.5 rounded"
      style={{
        background: meta.color + "22",
        color: meta.color,
        border: `1px solid ${meta.color}44`,
        fontSize: 10,
        letterSpacing: "0.05em",
      }}
    >
      {meta.label}
    </span>
  );
}

export default function FileUpload({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(files: File[]): File[] {
    setValidationError(null);
    const valid = files.filter(f =>
      ACCEPTED_EXTS.some(e => f.name.toLowerCase().endsWith(e))
    );
    const totalSize = valid.reduce((s, f) => s + f.size, 0);
    if (valid.length < files.length) {
      setValidationError(`${files.length - valid.length} unsupported file(s) removed.`);
    }
    if (totalSize > MAX_BYTES) {
      setValidationError("Total size exceeds 50 MB limit.");
      return [];
    }
    return valid;
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const valid = validate(Array.from(list));
    if (valid.length) setSelected(valid);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }

  const totalSize = selected.reduce((s, f) => s + f.size, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${dragging ? "var(--c-primary)" : "var(--c-border-2)"}`,
          borderRadius: "var(--r-lg)",
          padding: "28px 20px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          background: dragging ? "var(--c-primary-glow)" : "var(--c-surface-3)",
          transition: "background var(--t-mid) var(--ease), border-color var(--t-mid) var(--ease)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>
          {dragging ? "⬇" : "📂"}
        </div>
        <p style={{ color: "var(--c-text)", fontSize: 13, fontWeight: 500 }}>
          {dragging ? "Drop files here" : "Drag & drop files"}
        </p>
        <p style={{ color: "var(--c-text-2)", fontSize: 12, marginTop: 4 }}>
          or <span style={{ color: "var(--c-primary)", fontWeight: 600 }}>browse</span> · PDF, DOCX, TXT, MD
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTS.join(",")}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <p
          className="anim-fade-in text-xs px-3 py-2 rounded-lg"
          style={{ background: "var(--c-error-bg)", color: "var(--c-error)", border: "1px solid var(--c-error-bdr)" }}
        >
          {validationError}
        </p>
      )}

      {/* File list */}
      {selected.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selected.map((f, i) => (
            <li
              key={f.name}
              className="anim-fade-up flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: "var(--c-surface-3)",
                border: "1px solid var(--c-border)",
                animationDelay: `${i * 50}ms`,
              }}
            >
              <ExtBadge name={f.name} />
              <span style={{ color: "var(--c-text)", fontSize: 12, flex: 1, minWidth: 0 }} className="truncate">
                {f.name}
              </span>
              <span style={{ color: "var(--c-text-3)", fontSize: 11, flexShrink: 0 }}>
                {formatBytes(f.size)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--c-text-3)", fontSize: 11 }}>
            {selected.length} file{selected.length > 1 ? "s" : ""} · {formatBytes(totalSize)}
          </span>
          <button
            onClick={() => { setSelected([]); setValidationError(null); }}
            style={{ color: "var(--c-text-3)", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={() => selected.length > 0 && onUpload(selected)}
        disabled={disabled || selected.length === 0}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "var(--r-md)",
          background: selected.length > 0 && !disabled ? "var(--c-primary)" : "var(--c-surface-3)",
          color: selected.length > 0 && !disabled ? "#fff" : "var(--c-text-3)",
          border: "1px solid " + (selected.length > 0 && !disabled ? "var(--c-primary)" : "var(--c-border)"),
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled || selected.length === 0 ? "not-allowed" : "pointer",
          transition: "background var(--t-mid) var(--ease), box-shadow var(--t-mid) var(--ease), opacity var(--t-mid) var(--ease)",
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={e => {
          if (selected.length > 0 && !disabled)
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px var(--c-primary-glow)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        {disabled && selected.length > 0 ? "Processing…" : `Upload${selected.length > 0 ? ` ${selected.length} file${selected.length > 1 ? "s" : ""}` : ""}`}
      </button>
    </div>
  );
}
