import { ImageResponse } from "next/og";

export const alt = "Moggle.org — Free Online Word Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const tiles = ["M", "O", "G", "G", "L", "E", "W", "O", "R", "D", "S", "N", "O", "W", "!", "?"];

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #0F2016 0%, #1A3C34 58%, #2D6A4F 100%)",
          color: "#F9F7F1",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 88px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ color: "#D4AF37", display: "flex", fontSize: 25, fontWeight: 700, letterSpacing: 5 }}>
            MOGGLE.ORG
          </div>
          <div style={{ display: "flex", fontFamily: "serif", fontSize: 72, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, marginTop: 24 }}>
            Find words.<br />Beat the clock.
          </div>
          <div style={{ color: "#C7D4CD", display: "flex", fontSize: 28, lineHeight: 1.35, marginTop: 26 }}>
            A free daily word-grid game. No account needed to play.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, width: 360 }}>
          {tiles.map((tile, index) => (
            <div
              key={`${tile}-${index}`}
              style={{
                alignItems: "center",
                background: index === 0 || index === 5 || index === 10 ? "#D4AF37" : "rgba(255,255,255,0.1)",
                border: index === 0 || index === 5 || index === 10 ? "2px solid #F6D86D" : "2px solid rgba(255,255,255,0.2)",
                borderRadius: 16,
                color: index === 0 || index === 5 || index === 10 ? "#142E28" : "#F9F7F1",
                display: "flex",
                fontFamily: "serif",
                fontSize: 42,
                fontWeight: 700,
                height: 78,
                justifyContent: "center",
                width: 78,
              }}
            >
              {tile}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
