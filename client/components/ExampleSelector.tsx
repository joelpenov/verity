"use client";

import type { Example } from "@/types";

const EXAMPLES: Example[] = [
  {
    id: "research-paper",
    title: "Research Paper",
    description: "Academic paper on machine learning",
    sampleQuestion: "What are the main contributions of this paper?",
  },
  {
    id: "financial-report",
    title: "Financial Report",
    description: "Quarterly earnings & analysis",
    sampleQuestion: "What was the revenue growth this quarter?",
  },
  {
    id: "legal-contract",
    title: "Legal Contract",
    description: "Software licensing agreement",
    sampleQuestion: "What are the termination conditions?",
  },
];

const ICONS: Record<string, string> = {
  "research-paper":   "🔬",
  "financial-report": "📈",
  "legal-contract":   "⚖️",
};

interface Props {
  onSelect: (example: Example) => void;
  disabled?: boolean;
}

export default function ExampleSelector({ onSelect, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {EXAMPLES.map((ex, i) => (
        <button
          key={ex.id}
          onClick={() => !disabled && onSelect(ex)}
          disabled={disabled}
          className={`anim-fade-up delay-${i + 1} text-left glass glass-hover rounded-xl p-3`}
          style={{
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            border: "1px solid var(--c-border)",
            transition: "border-color var(--t-mid) var(--ease), background var(--t-mid) var(--ease), box-shadow var(--t-mid) var(--ease)",
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px var(--c-primary-glow)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>{ICONS[ex.id]}</span>
            <div>
              <p style={{ color: "var(--c-text)", fontSize: 13, fontWeight: 600 }}>{ex.title}</p>
              <p style={{ color: "var(--c-text-2)", fontSize: 11, marginTop: 1 }}>{ex.description}</p>
            </div>
          </div>
          <p
            style={{
              color: "var(--c-text-3)",
              fontSize: 11,
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid var(--c-border)",
              fontStyle: "italic",
            }}
          >
            "{ex.sampleQuestion}"
          </p>
        </button>
      ))}
    </div>
  );
}
