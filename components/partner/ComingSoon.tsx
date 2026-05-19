"use client";

interface Props {
  title: string;
  description?: string;
  emoji?: string;
}

export default function ComingSoon({ title, description, emoji = "✨" }: Props) {
  return (
    <div style={{ fontFamily: "var(--font-montserrat)" }}>
      <h1 style={{
        fontSize: 26, fontWeight: 800, color: "#161620",
        letterSpacing: "-0.02em", margin: "0 0 6px",
      }}>
        {title}
      </h1>
      {description && (
        <p style={{ fontSize: 13, color: "#9AA0B0", margin: "0 0 24px" }}>
          {description}
        </p>
      )}
      <div style={{
        background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 18,
        padding: "56px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>{emoji}</div>
        <div style={{
          fontSize: 18, fontWeight: 700, color: "#161620", marginBottom: 6,
          letterSpacing: "-0.01em",
        }}>В разработке</div>
        <div style={{
          fontSize: 13, color: "#9AA0B0", maxWidth: 360, margin: "0 auto",
          lineHeight: 1.55,
        }}>
          Раздел будет добавлен позже
        </div>
      </div>
    </div>
  );
}
