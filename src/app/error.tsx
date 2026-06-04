"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          backgroundColor: "white",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#dc2626", marginBottom: "1rem" }}>
          Erreur de chargement
        </h1>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#991b1b",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <strong>Error:</strong> {error?.message || "Unknown error"}
          {error?.digest && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#7f1d1d" }}>
              Digest: {error.digest}
            </div>
          )}
          {error?.stack && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#7f1d1d", maxHeight: "200px", overflow: "auto" }}>
              {error.stack}
            </div>
          )}
        </div>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
