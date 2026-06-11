"use client";

import { useState, KeyboardEvent, useEffect } from "react";

const SUGGESTIONS = [
  "What is the main topic of this document?",
  "Summarize the key points",
  "What are the conclusions or recommendations?",
  "List any important dates, figures, or names mentioned",
];

interface Props {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  defaultValue?: string;
  showSuggestions?: boolean;
}

const MAX_CHARS = 500;

export default function QueryInput({ onSubmit, disabled, defaultValue = "", showSuggestions }: Props) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (defaultValue) setValue(defaultValue);
  }, [defaultValue]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit(value.trim());
    }
  }

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <div className="flex flex-col gap-3">
      {/* Suggested question chips */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 anim-fade-in">
          {SUGGESTIONS.map(q => (
            <button
              key={q}
              onClick={() => setValue(q)}
              disabled={disabled}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: "var(--r-2xl)",
                background: "var(--c-surface-3)",
                color: "var(--c-text-2)",
                border: "1px solid var(--c-border)",
                cursor: "pointer",
                transition: "background var(--t-mid) var(--ease), color var(--t-mid) var(--ease), border-color var(--t-mid) var(--ease)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "var(--c-primary-glow)";
                el.style.color = "var(--c-primary-bright)";
                el.style.borderColor = "var(--c-border-focus)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "var(--c-surface-3)";
                el.style.color = "var(--c-text-2)";
                el.style.borderColor = "var(--c-border)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div style={{ position: "relative" }}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={disabled ? "Upload documents to start asking questions…" : "Ask anything about your documents… (Enter to send)"}
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            paddingBottom: "28px",
            borderRadius: "var(--r-lg)",
            background: "var(--c-surface-2)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "none",
            outline: "none",
            transition: "border-color var(--t-mid) var(--ease), box-shadow var(--t-mid) var(--ease)",
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = "var(--c-border-focus)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--c-primary-glow)";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "var(--c-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <span
          style={{
            position: "absolute",
            bottom: 8,
            right: 10,
            fontSize: 10,
            color: value.length > MAX_CHARS * 0.9 ? "var(--c-warn)" : "var(--c-text-3)",
          }}
        >
          {value.length}/{MAX_CHARS}
        </span>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span style={{ color: "var(--c-text-3)", fontSize: 11 }}>
          {!disabled && "⏎ Enter to send · Shift+Enter for new line"}
        </span>
        <button
          onClick={() => canSubmit && onSubmit(value.trim())}
          disabled={!canSubmit}
          style={{
            padding: "8px 20px",
            borderRadius: "var(--r-md)",
            background: canSubmit ? "var(--c-primary)" : "var(--c-surface-3)",
            color: canSubmit ? "#fff" : "var(--c-text-3)",
            border: "1px solid " + (canSubmit ? "var(--c-primary)" : "var(--c-border)"),
            fontSize: 13,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "background var(--t-mid) var(--ease), box-shadow var(--t-mid) var(--ease)",
          }}
          onMouseEnter={e => {
            if (canSubmit) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px var(--c-primary-glow)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
