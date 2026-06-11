interface Props {
  report: string;
}

function parseReport(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split("\n").filter(Boolean)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

function YesNoBadge({ value }: { value: string }) {
  const yes = value.toUpperCase() === "YES";
  return (
    <span
      className="anim-scale-in inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: yes ? "var(--c-success-bg)" : "var(--c-error-bg)",
        color:      yes ? "var(--c-success)"    : "var(--c-error)",
        border:     `1px solid ${yes ? "var(--c-success-bdr)" : "var(--c-error-bdr)"}`,
      }}
    >
      {yes ? "✓" : "✗"} {value.toUpperCase()}
    </span>
  );
}

function Row({ label, children, delay = 0 }: { label: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className={`anim-fade-up delay-${delay}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--c-border)",
      }}
    >
      <span style={{ color: "var(--c-text-3)", fontSize: 11, fontWeight: 600, width: 140, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 2 }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function VerificationReport({ report }: Props) {
  const p = parseReport(report);

  return (
    <div style={{ fontSize: 13 }}>
      {p["Supported"] && (
        <Row label="Supported" delay={1}><YesNoBadge value={p["Supported"]} /></Row>
      )}
      {p["Relevant"] && (
        <Row label="Relevant" delay={2}><YesNoBadge value={p["Relevant"]} /></Row>
      )}
      {p["Unsupported Claims"] && (
        <Row label="Unsupported Claims" delay={3}>
          <span style={{ color: p["Unsupported Claims"] === "None" || p["Unsupported Claims"] === "[]" ? "var(--c-text-3)" : "var(--c-warn)" }}>
            {p["Unsupported Claims"] === "[]" ? "None" : p["Unsupported Claims"] || "None"}
          </span>
        </Row>
      )}
      {p["Contradictions"] && (
        <Row label="Contradictions" delay={4}>
          <span style={{ color: p["Contradictions"] === "None" || p["Contradictions"] === "[]" ? "var(--c-text-3)" : "var(--c-error)" }}>
            {p["Contradictions"] === "[]" ? "None" : p["Contradictions"] || "None"}
          </span>
        </Row>
      )}
      {p["Additional Details"] && (
        <div
          className="anim-fade-up"
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: "var(--r-md)",
            background: "var(--c-surface-3)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text-2)",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {p["Additional Details"]}
        </div>
      )}
    </div>
  );
}
