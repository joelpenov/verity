"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import ExampleSelector from "@/components/ExampleSelector";
import QueryInput from "@/components/QueryInput";
import VerificationReport from "@/components/VerificationReport";
import Skeleton from "@/components/Skeleton";
import TypewriterText from "@/components/TypewriterText";
import { uploadDocuments, loadExample, queryDocuments } from "@/lib/api";
import type { AppStatus, Example, QueryResponse } from "@/types";

/* ─── Relevance config ──────────────────────────────────── */
const RELEVANCE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  CAN_ANSWER: {
    label: "Fully Covered",
    bg: "var(--c-success-bg)", color: "var(--c-success)", border: "var(--c-success-bdr)",
  },
  PARTIAL: {
    label: "Partially Covered",
    bg: "var(--c-warn-bg)", color: "var(--c-warn)", border: "var(--c-warn-bdr)",
  },
  NO_MATCH: {
    label: "Not in Documents",
    bg: "var(--c-error-bg)", color: "var(--c-error)", border: "var(--c-error-bdr)",
  },
};

/* ─── Dot loader ────────────────────────────────────────── */
function DotLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 anim-fade-in">
      <div className="dot-loader flex gap-1">
        <span /><span /><span />
      </div>
      <span style={{ color: "var(--c-text-2)", fontSize: 13 }}>{label}</span>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 anim-fade-in" style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "var(--r-xl)",
        background: "var(--c-primary-glow)",
        border: "1px solid var(--c-border-focus)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
      }}>
        💬
      </div>
      <div>
        <p style={{ color: "var(--c-text)", fontSize: 15, fontWeight: 600 }}>Ready to answer</p>
        <p style={{ color: "var(--c-text-2)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
          Upload or select a document on the left,<br />then ask any question about its contents.
        </p>
      </div>
      <div className="flex flex-col gap-2" style={{ width: "100%", maxWidth: 280 }}>
        {["Smart relevance detection", "Multi-agent verification", "Source-grounded answers"].map((feat, i) => (
          <div
            key={feat}
            className={`anim-fade-up delay-${i + 1} flex items-center gap-2`}
            style={{ padding: "6px 12px", borderRadius: "var(--r-md)", background: "var(--c-surface-3)", border: "1px solid var(--c-border)" }}
          >
            <span style={{ color: "var(--c-primary)", fontSize: 12 }}>✦</span>
            <span style={{ color: "var(--c-text-2)", fontSize: 12 }}>{feat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function HomePage() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [docLabel, setDocLabel] = useState("");
  const [defaultQuestion, setDefaultQuestion] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState("");

  const isReady    = status === "ready";
  const isUploading = status === "uploading";
  const isQuerying  = status === "querying";
  const hasResult   = result !== null;
  const hasDoc      = documentIds.length > 0 && (isReady || isQuerying || hasResult);

  async function handleUpload(files: File[]) {
    setStatus("uploading");
    setError(null);
    setResult(null);
    try {
      const { document_ids } = await uploadDocuments(files);
      setDocumentIds(document_ids);
      setDocLabel(`${files.length} file${files.length > 1 ? "s" : ""}`);
      setDefaultQuestion("");
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  }

  async function handleExample(example: Example) {
    setStatus("uploading");
    setError(null);
    setResult(null);
    try {
      const { document_ids } = await loadExample(example.id);
      setDocumentIds(document_ids);
      setDocLabel(example.title);
      setDefaultQuestion(example.sampleQuestion);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load example");
      setStatus("error");
    }
  }

  async function handleQuery(question: string) {
    setLastQuestion(question);
    setStatus("querying");
    setError(null);
    setResult(null);
    try {
      const data = await queryDocuments(question, documentIds);
      setResult(data);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        backgroundImage: [
          "radial-gradient(ellipse 70% 60% at 15% 15%, rgba(59,130,246,0.08) 0%, transparent 65%)",
          "radial-gradient(ellipse 50% 50% at 85% 85%, rgba(99,102,241,0.06) 0%, transparent 65%)",
          "radial-gradient(ellipse 35% 40% at 65% 20%, rgba(16,185,129,0.04) 0%, transparent 60%)",
        ].join(","),
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--c-border)",
          background: "rgba(6,12,26,0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 30, height: 30, borderRadius: "var(--r-md)",
            background: "linear-gradient(135deg, var(--c-primary), #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 16px var(--c-primary-glow)",
          }}>
            V
          </div>
          <span style={{ color: "var(--c-text)", fontSize: 15, fontWeight: 700 }}>Verity</span>
          <span style={{
            fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.08em",
            textTransform: "uppercase", paddingLeft: 6,
            borderLeft: "1px solid var(--c-border)", marginLeft: 4,
          }}>
            Multi-Agent RAG
          </span>
        </div>

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isUploading && <DotLoader label="Processing…" />}
          {isQuerying  && <DotLoader label="Analyzing…" />}
          {isReady && hasDoc && (
            <div className="anim-scale-in flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: "var(--c-success-bg)", border: "1px solid var(--c-success-bdr)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-success)", display: "inline-block" }} />
              <span style={{ color: "var(--c-success)", fontSize: 12, fontWeight: 500 }}>
                {docLabel} ready
              </span>
            </div>
          )}
          {status === "error" && (
            <div className="anim-scale-in flex items-center gap-2 px-3 py-1 rounded-full"
              style={{ background: "var(--c-error-bg)", border: "1px solid var(--c-error-bdr)" }}>
              <span style={{ color: "var(--c-error)", fontSize: 12, fontWeight: 500 }}>Error</span>
            </div>
          )}
          {status === "idle" && (
            <span style={{ color: "var(--c-text-3)", fontSize: 12 }}>No document loaded</span>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 0,
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        padding: "24px 24px",
        alignItems: "start",
      }}
        className="max-lg:grid-cols-1"
      >
        {/* ── Left: Document panel ── */}
        <div className="flex flex-col gap-4 anim-fade-up" style={{ paddingRight: 20 }}>
          {/* Upload */}
          <div className="glass" style={{ padding: 20 }}>
            <h2 style={{
              color: "var(--c-text)", fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>📄</span> Upload Documents
            </h2>
            <FileUpload onUpload={handleUpload} disabled={isUploading || isQuerying} />
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
            <span style={{ color: "var(--c-text-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>or try an example</span>
            <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
          </div>

          {/* Examples */}
          <div className="glass" style={{ padding: 20 }}>
            <h2 style={{
              color: "var(--c-text)", fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 16,
            }}>
              Example Documents
            </h2>
            <ExampleSelector onSelect={handleExample} disabled={isUploading || isQuerying} />
          </div>
        </div>

        {/* ── Right: Query & Results panel ── */}
        <div className="flex flex-col gap-4 anim-fade-up delay-1" style={{ minHeight: 600 }}>

          {/* Error banner */}
          {status === "error" && error && (
            <div
              className="anim-fade-up flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--c-error-bg)", border: "1px solid var(--c-error-bdr)" }}
            >
              <span style={{ color: "var(--c-error)", fontSize: 18 }}>⚠</span>
              <div>
                <p style={{ color: "var(--c-error)", fontSize: 13, fontWeight: 600 }}>Something went wrong</p>
                <p style={{ color: "var(--c-error)", fontSize: 12, marginTop: 2, opacity: 0.85 }}>{error}</p>
                <button
                  onClick={() => setStatus("idle")}
                  style={{
                    marginTop: 8, fontSize: 11, fontWeight: 600,
                    color: "var(--c-error)", background: "none", border: "none", cursor: "pointer",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  Dismiss and try again →
                </button>
              </div>
            </div>
          )}

          {/* Query input card */}
          <div className="glass" style={{ padding: 20 }}>
            <h2 style={{
              color: "var(--c-text)", fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>💬</span> Ask Your Documents
            </h2>
            <QueryInput
              onSubmit={handleQuery}
              disabled={!hasDoc || isQuerying || isUploading}
              defaultValue={defaultQuestion}
              showSuggestions={hasDoc && !isQuerying}
            />
          </div>

          {/* Querying skeleton */}
          {isQuerying && (
            <div className="glass anim-fade-in" style={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="dot-loader flex gap-1"><span /><span /><span /></div>
                <span style={{ color: "var(--c-text-2)", fontSize: 13 }}>
                  Agents are analyzing <em style={{ color: "var(--c-primary-bright)" }}>"{lastQuestion}"</em>
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <Skeleton height={12} width="60%" className="mb-4" />
                  <Skeleton lines={5} />
                </div>
                <div>
                  <Skeleton height={12} width="50%" className="mb-4" />
                  <Skeleton lines={4} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {hasResult && !isQuerying && result && (
            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1 anim-fade-up">
              {/* Answer */}
              <div className="glass" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ color: "var(--c-text)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Answer
                  </h3>
                  {result.relevance && RELEVANCE[result.relevance] && (
                    <span
                      className="anim-scale-in text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: RELEVANCE[result.relevance].bg,
                        color:      RELEVANCE[result.relevance].color,
                        border:     `1px solid ${RELEVANCE[result.relevance].border}`,
                        fontSize: 11,
                      }}
                    >
                      {RELEVANCE[result.relevance].label}
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--c-text)", fontSize: 13, lineHeight: 1.75 }}>
                  <TypewriterText text={result.answer} speed={10} />
                </p>
              </div>

              {/* Verification report */}
              <div className="glass" style={{ padding: 20 }}>
                <h3 style={{
                  color: "var(--c-text)", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16,
                }}>
                  Verification Report
                </h3>
                <VerificationReport report={result.verification_report} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasDoc && !isUploading && status !== "error" && (
            <div className="glass" style={{ flex: 1, minHeight: 400 }}>
              <EmptyState />
            </div>
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--c-border)",
        padding: "12px 24px",
        textAlign: "center",
        background: "rgba(6,12,26,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <span style={{ color: "var(--c-text-3)", fontSize: 12 }}>
          Built by{" "}
          <a
            href="https://github.com/joelpenov"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--c-primary-bright)",
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity var(--t-fast) var(--ease)",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            @joelpenov
          </a>
        </span>
      </footer>
    </div>
  );
}
