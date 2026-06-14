"use client";

interface Props {
  names: string[];
  isLoading: boolean;
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "md") return "🗒";
  return "📃";
}

function fileTypeLabel(name: string): string {
  return (name.split(".").pop() ?? "file").toUpperCase();
}

function truncate(name: string, max = 28): string {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? "." + name.split(".").pop() : "";
  return name.slice(0, max - ext.length - 1) + "…" + ext;
}

export default function DocumentList({ names, isLoading }: Props) {
  if (!isLoading && names.length === 0) return null;

  return (
    <div className="glass anim-fade-up" style={{ padding: 14 }}>
      <h2
        style={{
          color: "var(--c-text)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🗂</span> Loaded Documents
        </span>
        {!isLoading && (
          <span
            className="anim-scale-in"
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 999,
              background: "var(--c-primary-glow)",
              border: "1px solid var(--c-border-focus)",
              color: "var(--c-primary-bright)",
              letterSpacing: "0.04em",
            }}
          >
            {names.length}
          </span>
        )}
      </h2>

      <div className="flex flex-col gap-1.5">
        {isLoading
          ? /* Shimmer skeletons while processing */
            [0, 1].map((i) => (
              <div
                key={i}
                className="shimmer"
                style={{ height: 34, borderRadius: "var(--r-md)" }}
              />
            ))
          : names.map((name, i) => (
              <div
                key={name + i}
                className={`anim-fade-up delay-${Math.min(i + 1, 4)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: "var(--r-md)",
                  background: "var(--c-surface-3)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{fileIcon(name)}</span>
                <span
                  title={name}
                  style={{
                    color: "var(--c-text)",
                    fontSize: 12,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                >
                  {truncate(name)}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--c-text-3)",
                    padding: "1px 5px",
                    borderRadius: "var(--r-sm)",
                    background: "var(--c-border)",
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                  }}
                >
                  {fileTypeLabel(name)}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}
