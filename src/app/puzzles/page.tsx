import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function PuzzlesPage() {
  return (
    <AppShell title="Puzzles" active="puzzles">
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-6 max-w-sm">
        <div
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(135deg, #1A3C34, #0F2016)",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            border: "1px solid rgba(212,175,55,0.2)",
            boxShadow: "0 8px 24px -4px rgba(26,25,21,0.2)",
          }}
        >
          🧩
        </div>

        <div>
          <div
            style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#D4AF37", marginBottom: 10 }}
          >
            Coming Soon
          </div>
          <h1
            style={{ fontFamily: "var(--font-fraunces)", fontSize: 36, fontWeight: 700, color: "#1A3C34", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 12 }}
          >
            Puzzle Mode
          </h1>
          <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, color: "#8A8A8A", lineHeight: 1.6 }}>
            A new way to play Moggle — find every word on the board, no timer, no pressure. Coming soon.
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            background: "#1A3C34",
            color: "#EDE8DF",
            borderRadius: 10,
            fontFamily: "var(--font-geist-sans)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Back to Dashboard
        </Link>
        </div>
      </div>
    </AppShell>
  );
}
