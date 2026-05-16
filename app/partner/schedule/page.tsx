export default function SchedulePage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>Расписание</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Управление рабочими слотами мастеров</p>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 4 }}>Скоро</div>
        <div style={{ fontSize: 12, color: "#aaa" }}>Управление расписанием будет доступно в следующем обновлении</div>
      </div>
    </div>
  );
}
