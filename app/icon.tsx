import { ImageResponse } from "next/og";

// Next.js auto-serves this as /favicon.ico equivalent for tabs / bookmarks.
// Pure SVG-from-JSX → tiny output, no oversized PNG choking on resize.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#4A6741",
          color: "#FAF6F0",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          letterSpacing: "-0.04em",
          borderRadius: 6,
        }}
      >
        B
      </div>
    ),
    { ...size },
  );
}
