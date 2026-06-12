"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const result = await signIn("google", { callbackUrl: "/" });
    if (result?.error) {
      setError("Access denied. Only authorised accounts may sign in.");
      setLoading(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#060c1a",
      }}>
        <div style={{
          width: 32, height: 32,
          border: "2.5px solid rgba(148,163,184,0.2)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      background: "#060c1a",
      backgroundImage: [
        "radial-gradient(ellipse 70% 60% at 15% 15%, rgba(59,130,246,0.08) 0%, transparent 65%)",
        "radial-gradient(ellipse 50% 50% at 85% 85%, rgba(99,102,241,0.06) 0%, transparent 65%)",
        "radial-gradient(ellipse 35% 40% at 65% 20%, rgba(16,185,129,0.04) 0%, transparent 60%)",
      ].join(","),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 380,
        padding: "0 20px",
        animation: "fade-up 280ms cubic-bezier(0.16,1,0.3,1) both",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 32px rgba(59,130,246,0.35)",
            margin: "0 auto 14px",
          }}>
            V
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>Verity</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Multi-Agent RAG System</p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(13,21,40,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(148,163,184,0.1)",
          borderRadius: 18,
          padding: "28px 24px",
        }}>
          <h2 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
            Sign in to continue
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 24px", lineHeight: 1.6 }}>
            Access is restricted to authorised accounts only.
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.28)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 16,
              color: "#ef4444",
              fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 10,
              background: loading ? "rgba(32,48,80,0.5)" : "#fff",
              color: loading ? "#94a3b8" : "#1f2937",
              border: "1px solid rgba(148,163,184,0.2)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 150ms ease, box-shadow 150ms ease",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            {loading ? (
              <span style={{
                width: 18, height: 18, flexShrink: 0,
                border: "2px solid rgba(148,163,184,0.3)",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }} />
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Signing in…" : "Sign in with Google"}
          </button>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: "center", color: "#475569", fontSize: 11,
          marginTop: 20, lineHeight: 1.6,
        }}>
          Protected by Google OAuth · Only authorised accounts can access this app
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
