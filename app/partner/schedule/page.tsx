export default function SchedulePage() {
  return (
    <div>
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid #E8E5DF" }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: "#AAAAAA", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Управление</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: "#111111", margin: 0, lineHeight: 1.1 }}>Расписание</h1>
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #E8E5DF", padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>Скоро</div>
        <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, color: "#AAAAAA" }}>Раздел расписания в разработке</div>
      </div>
    </div>
  );
}
