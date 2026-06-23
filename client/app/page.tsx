"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useSession, signOut } from "next-auth/react";
import FileUpload from "@/components/FileUpload";
import QueryInput from "@/components/QueryInput";
import VerificationReport from "@/components/VerificationReport";
import Skeleton from "@/components/Skeleton";
import TypewriterText from "@/components/TypewriterText";
import DocumentList from "@/components/DocumentList";
import { uploadDocuments, queryDocuments, clearFiles } from "@/lib/api";
import type { AppStatus, QueryResponse } from "@/types";

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
    <div className="flex items-center gap-2 anim-fade-in">
      <div className="dot-loader flex gap-1"><span /><span /><span /></div>
      <span className="hidden sm:inline" style={{ color: "var(--c-text-2)", fontSize: 13 }}>{label}</span>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 anim-fade-in"
      style={{ padding: "24px 20px", textAlign: "center" }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "var(--r-lg)",
        background: "var(--c-primary-glow)",
        border: "1px solid var(--c-border-focus)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
      }}>
        💬
      </div>
      <div>
        <p style={{ color: "var(--c-text)", fontSize: 14, fontWeight: 600 }}>Ready to answer</p>
        <p style={{ color: "var(--c-text-2)", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
          Upload a document first,<br />then ask any question about it.
        </p>
      </div>
      <div className="flex flex-col gap-1.5" style={{ width: "100%", maxWidth: 260 }}>
        {["Smart relevance detection", "Multi-agent verification", "Source-grounded answers"].map((feat, i) => (
          <div
            key={feat}
            className={`anim-fade-up delay-${i + 1} flex items-center gap-2`}
            style={{ padding: "5px 10px", borderRadius: "var(--r-md)", background: "var(--c-surface-3)", border: "1px solid var(--c-border)" }}
          >
            <span style={{ color: "var(--c-primary)", fontSize: 11 }}>✦</span>
            <span style={{ color: "var(--c-text-2)", fontSize: 11 }}>{feat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── User menu dropdown ────────────────────────────────── */
function UserMenu({ onClear, clearDisabled }: { onClear: () => void; clearDisabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItemStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    width: "100%", padding: "7px 12px",
    background: "none", border: "none", cursor: "pointer",
    fontSize: 12, textAlign: "left", borderRadius: "var(--r-md)",
    transition: "background var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none", border: "1px solid var(--c-border)",
          borderRadius: "var(--r-md)", padding: "4px 10px",
          color: "var(--c-text-3)", fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          transition: "border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--c-border-focus)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--c-text)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--c-border)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--c-text-3)";
        }}
      >
        Account
        <span style={{ fontSize: 9, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="anim-scale-in"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            minWidth: 160, background: "var(--c-surface-2)",
            border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)", padding: 4, zIndex: 100,
          }}
        >
          <button
            onClick={() => { setOpen(false); onClear(); }}
            disabled={clearDisabled}
            style={{
              ...menuItemStyle,
              color: clearDisabled ? "var(--c-text-3)" : "var(--c-warn)",
              opacity: clearDisabled ? 0.45 : 1,
              cursor: clearDisabled ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => { if (!clearDisabled) (e.currentTarget as HTMLButtonElement).style.background = "var(--c-warn-bg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            <span>🗑</span> Clean Files
          </button>
          <div style={{ height: 1, background: "var(--c-border)", margin: "2px 4px" }} />
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
            style={{ ...menuItemStyle, color: "var(--c-error)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--c-error-bg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            <span>↪</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function HomePage() {
  const { data: session } = useSession();
  const idToken = session?.idToken;

  const [status, setStatus]               = useState<AppStatus>("idle");
  const [documentIds, setDocumentIds]     = useState<string[]>([]);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [docLabel, setDocLabel]           = useState("");
  const [result, setResult]               = useState<QueryResponse | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [lastQuestion, setLastQuestion]   = useState("");
  const [mobileTab, setMobileTab]         = useState<"docs" | "ask">("docs");

  const isReady     = status === "ready";
  const isUploading = status === "uploading";
  const isQuerying  = status === "querying";
  const hasResult   = result !== null;
  const hasDoc      = documentIds.length > 0 && (isReady || isQuerying || hasResult);

  async function handleUpload(files: File[]) {
    setStatus("uploading");
    setError(null);
    setResult(null);
    try {
      const { document_ids, document_names } = await uploadDocuments(files, idToken);
      setDocumentIds(document_ids);
      setDocumentNames(document_names ?? files.map((f) => f.name));
      setDocLabel(`${files.length} file${files.length > 1 ? "s" : ""}`);
      setStatus("ready");
      setMobileTab("ask"); // Progressive disclosure: auto-navigate after upload
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  }

  async function handleClear() {
    try {
      await clearFiles(idToken);
    } catch {
      // best-effort — reset UI regardless
    }
    setDocumentIds([]);
    setDocumentNames([]);
    setDocLabel("");
    setResult(null);
    setError(null);
    setLastQuestion("");
    setStatus("idle");
    setMobileTab("docs"); // Return to upload view
  }

  async function handleQuery(question: string) {
    setLastQuestion(question);
    setStatus("querying");
    setError(null);
    setResult(null);
    try {
      const data = await queryDocuments(question, documentIds, idToken);
      setResult(data);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
      setStatus("error");
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden"
      style={{
        background: "var(--c-bg)",
        backgroundImage: [
          "radial-gradient(ellipse 70% 60% at 15% 15%, rgba(59,130,246,0.08) 0%, transparent 65%)",
          "radial-gradient(ellipse 50% 50% at 85% 85%, rgba(99,102,241,0.06) 0%, transparent 65%)",
          "radial-gradient(ellipse 35% 40% at 65% 20%, rgba(16,185,129,0.04) 0%, transparent 60%)",
        ].join(","),
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          padding: "0 16px",
          height: 48,
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
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <div style={{
            width: 30, height: 30, borderRadius: "var(--r-md)", flexShrink: 0,
            background: "linear-gradient(135deg, var(--c-primary), #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 16px var(--c-primary-glow)",
          }}>
            V
          </div>
          <span style={{ color: "var(--c-text)", fontSize: 15, fontWeight: 700 }}>Verity</span>
          {/* Subtitle hidden on mobile — saves header space */}
          <span className="hidden sm:inline" style={{
            fontSize: 10, color: "var(--c-text-3)", letterSpacing: "0.08em",
            textTransform: "uppercase", paddingLeft: 6,
            borderLeft: "1px solid var(--c-border)", marginLeft: 4,
          }}>
            Multi-Agent RAG
          </span>
        </div>

        <div className="flex items-center gap-2">
          <UserMenu
            onClear={handleClear}
            clearDisabled={documentIds.length === 0 || isUploading || isQuerying}
          />
          {/* Processing indicators — always visible, small footprint */}
          {isUploading && <DotLoader label="Processing…" />}
          {isQuerying  && <DotLoader label="Analyzing…" />}
          {/* Status pills — tablet & desktop only (mobile uses tab bar badge) */}
          <div className="hidden sm:flex items-center gap-2">
            {isReady && hasDoc && (
              <div className="anim-scale-in flex items-center gap-2 px-3 py-1 rounded-full"
                style={{ background: "var(--c-success-bg)", border: "1px solid var(--c-success-bdr)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-success)", display: "inline-block" }} />
                <span style={{ color: "var(--c-success)", fontSize: 12, fontWeight: 500 }}>{docLabel} ready</span>
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
        </div>
      </header>

      {/* ── Main ──
          Mobile    (<640px):  flex-col, one panel at a time via mobileTab state
          Tablet    (640-1023): flex-col, both panels stacked, page scrolls
          Desktop   (1024px+): CSS grid 300px|1fr, fixed height, panels scroll internally
      */}
      <main
        className="main-layout flex flex-col flex-1 gap-4 lg:gap-0 lg:min-h-0 lg:overflow-hidden max-w-[1200px] w-full mx-auto px-4 sm:px-5 pt-3.5 pb-16 sm:pb-4 lg:pb-3.5"
        style={{ alignItems: "stretch" }}
      >
        {/* ── Left: Document panel ── */}
        <div
          className={`flex-col gap-2 anim-fade-up lg:pr-4 lg:overflow-y-auto ${
            mobileTab === "ask" ? "panel-hidden-mobile" : "flex"
          }`}
        >
          <div className="glass" style={{ padding: 14 }}>
            <h2 style={{
              color: "var(--c-text)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>📄</span> Upload Documents
            </h2>
            <FileUpload
              onUpload={handleUpload}
              disabled={isUploading || isQuerying}
              isProcessing={isUploading}
            />
          </div>

          {(isUploading || documentNames.length > 0) && (
            <DocumentList names={documentNames} isLoading={isUploading} />
          )}
        </div>

        {/* ── Right: Query & Results panel ── */}
        <div
          className={`flex-col gap-3 anim-fade-up delay-1 lg:overflow-y-auto ${
            mobileTab === "docs" ? "panel-hidden-mobile" : "flex"
          }`}
        >
          {/* Error banner */}
          {status === "error" && error && (
            <div
              className="anim-fade-up flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{ background: "var(--c-error-bg)", border: "1px solid var(--c-error-bdr)" }}
            >
              <span style={{ color: "var(--c-error)", fontSize: 14 }}>⚠</span>
              <div>
                <p style={{ color: "var(--c-error)", fontSize: 12, fontWeight: 600 }}>{error}</p>
                <button
                  onClick={() => setStatus("idle")}
                  style={{ marginTop: 4, fontSize: 11, color: "var(--c-error)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  Dismiss →
                </button>
              </div>
            </div>
          )}

          {/* Query input */}
          <div className="glass" style={{ padding: 14 }}>
            <h2 style={{
              color: "var(--c-text)", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>💬</span> Ask Your Documents
            </h2>
            <QueryInput
              onSubmit={handleQuery}
              disabled={!hasDoc || isQuerying || isUploading}
              showSuggestions={hasDoc && !isQuerying}
            />
          </div>

          {/* Querying skeleton */}
          {isQuerying && (
            <div className="glass anim-fade-in" style={{ padding: 14 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="dot-loader flex gap-1"><span /><span /><span /></div>
                <span style={{ color: "var(--c-text-2)", fontSize: 12 }}>
                  Analyzing <em style={{ color: "var(--c-primary-bright)" }}>"{lastQuestion}"</em>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Skeleton height={10} width="60%" className="mb-3" /><Skeleton lines={4} /></div>
                <div><Skeleton height={10} width="50%" className="mb-3" /><Skeleton lines={3} /></div>
              </div>
            </div>
          )}

          {/* Results */}
          {hasResult && !isQuerying && result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 anim-fade-up">
              {/* Answer */}
              <div className="glass" style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <h3 style={{ color: "var(--c-text)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Answer
                  </h3>
                  {result.relevance && RELEVANCE[result.relevance] && (
                    <span
                      className="anim-scale-in"
                      style={{
                        background: RELEVANCE[result.relevance].bg,
                        color:      RELEVANCE[result.relevance].color,
                        border:     `1px solid ${RELEVANCE[result.relevance].border}`,
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      }}
                    >
                      {RELEVANCE[result.relevance].label}
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--c-text)", fontSize: 13, lineHeight: 1.65 }}>
                  <TypewriterText text={result.answer} speed={10} />
                </div>
              </div>

              {/* Verification report */}
              <div className="glass" style={{ padding: 14 }}>
                <h3 style={{
                  color: "var(--c-text)", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
                }}>
                  Verification Report
                </h3>
                <VerificationReport report={result.verification_report} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasDoc && !isUploading && status !== "error" && (
            <div className="glass" style={{ minHeight: 220 }}>
              <EmptyState />
            </div>
          )}
        </div>
      </main>

      {/* ── Footer — desktop only ── */}
      <footer
        className="hidden lg:block"
        style={{
          borderTop: "1px solid var(--c-border)",
          padding: "7px 20px",
          textAlign: "center",
          background: "rgba(6,12,26,0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--c-text-3)", fontSize: 12 }}>
          Built by{" "}
          <a
            href="https://github.com/joelpenov"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--c-primary-bright)", fontWeight: 600,
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

      {/* ── Mobile bottom tab bar (hidden at 640px+) ── */}
      <nav
        className="flex sm:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "rgba(6,12,26,0.92)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderTop: "1px solid var(--c-border)",
          padding: "4px 8px",
          paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {(
          [
            { id: "docs", icon: "📄", label: "Documents", badge: documentNames.length },
            { id: "ask",  icon: "💬", label: "Ask",       badge: 0 },
          ] as { id: "docs" | "ask"; icon: string; label: string; badge: number }[]
        ).map((tab) => {
          const active = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                border: "none",
                cursor: "pointer",
                borderRadius: "var(--r-lg)",
                padding: "8px 4px",
                margin: "0 2px",
                background: active ? "var(--c-primary-glow)" : "transparent",
                transition: "background var(--t-fast) var(--ease)",
              }}
            >
              <div style={{ position: "relative", lineHeight: 1 }}>
                <span style={{ fontSize: 20 }}>{tab.icon}</span>
                {tab.badge > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -4, right: -10,
                    minWidth: 16, height: 16,
                    borderRadius: 8,
                    background: "var(--c-primary)",
                    color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", lineHeight: 1,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--c-primary-bright)" : "var(--c-text-3)",
                letterSpacing: "0.02em",
              }}>
                {tab.label}
              </span>
              {active && (
                <div style={{
                  width: 16, height: 2,
                  borderRadius: 1,
                  background: "var(--c-primary)",
                  marginTop: 1,
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
