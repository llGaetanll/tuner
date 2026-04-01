import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tuner - Guitar Tuner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NOTES = ["E", "A", "D", "G", "B", "E"];
const OCTAVES = ["2", "2", "3", "3", "3", "4"];
const ABOVE = ["F", "A#", "D#", "G#", "C", "F"];
const BELOW = ["D#", "G#", "C#", "F#", "A#", "D#"];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#1f2937",
            marginBottom: 16,
            letterSpacing: -2,
          }}
        >
          Tuner
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#9ca3af",
            marginBottom: 48,
          }}
        >
          Guitar tuner with custom tuning presets
        </div>

        {/* Picker mockup */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Above row */}
          <div style={{ display: "flex", gap: 0, marginBottom: 8 }}>
            {ABOVE.map((n, i) => (
              <div
                key={i}
                style={{
                  width: 80,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#d1d5db",
                }}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Green bar */}
          <div
            style={{
              display: "flex",
              gap: 0,
              background: "linear-gradient(175deg, #4aded0 0%, #22c993 45%, #1cb886 100%)",
              borderRadius: 16,
              padding: "0 16px",
              border: "2px solid rgba(255, 255, 255, 0.5)",
            }}
          >
            {NOTES.map((n, i) => (
              <div
                key={i}
                style={{
                  width: 80,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "white",
                  position: "relative",
                }}
              >
                {n}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    opacity: 0.8,
                    position: "absolute",
                    right: 8,
                    bottom: 10,
                  }}
                >
                  {OCTAVES[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Below row */}
          <div style={{ display: "flex", gap: 0, marginTop: 8 }}>
            {BELOW.map((n, i) => (
              <div
                key={i}
                style={{
                  width: 80,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#d1d5db",
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 16,
            color: "#9ca3af",
          }}
        >
          tuner.almela.io
        </div>
      </div>
    ),
    { ...size },
  );
}
