"use client";
import { useEffect, useState, useMemo } from "react";
import MasterEditor, { MasterData } from "@/components/partner/MasterEditor";

const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
  primaryDk:  "#5B3FE5",
  primarySft: "#F0EDFE",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
  red:        "#EF4444",
  redSft:     "#FCE5E5",
  green:      "#1FB46A",
};

function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  plus:    "M12 5v14M5 12h14",
  user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  phone:   "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  search:  "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:  "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22",
};

const ROLE_ICONS: Record<string, string> = {
  "парикмахер":               "✂️",
  "мастер ногтевого сервиса": "💅",
  "массажист":                "💆",
  "косметолог":               "✨",
  "тренер":                   "🏋️",
  "мастер бровей":            "👁️",
  "мастер эпиляции":          "🌟",
  "специалист":               "🌿",
  "мастер татуажа":           "🎨",
};

interface Master {
  id: number;
  fullName: string;
  specialization: string;
  phone: string | null;
  telegramId: string | null;
  photoUrl: string | null;
  isActive: boolean;
  showOnSite: boolean;
  createdAt?: string;
}

function gradientFor(name: string): string {
  const palettes = [
    "linear-gradient(135deg, #7B61FF, #5B3FE5)",
    "linear-gradient(135deg, #F87171, #EF4444)",
    "linear-gradient(135deg, #36C77E, #1FB46A)",
    "linear-gradient(135deg, #FBA94C, #F97316)",
    "linear-gradient(135deg, #60A5FA, #2563EB)",
    "linear-gradient(135deg, #E879F9, #C026D3)",
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function rolesList(spec: string): string[] {
  return spec.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

function MasterCard({ master, onEdit }: { master: Master; onEdit: () => void }) {
  const roles = rolesList(master.specialization);
  const visibleRoles = roles.slice(0, 3);
  const hiddenCount = roles.length - visibleRoles.length;

  return (
    <div
      role="button" tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === "Enter") onEdit(); }}
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 20, padding: "20px 18px 16px",
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
        transition: "transform 0.15s ease, box-shadow 0.18s ease, border-color 0.15s ease",
        position: "relative",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 28px rgba(22,22,32,0.08)";
        e.currentTarget.style.borderColor = "rgba(123, 97, 255, 0.35)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = c.border;
      }}
    >
      {/* Hidden indicator */}
      {!master.showOnSite && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          width: 26, height: 26, borderRadius: 9,
          background: c.bgSoft, color: c.txtMute,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${c.border}`,
        }} title="Скрыт со страницы записи">
          <Ic d={I.eyeOff} size={13} />
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: 84, height: 84, borderRadius: "50%",
        background: master.photoUrl
          ? `url(${master.photoUrl}) center/cover`
          : gradientFor(master.fullName),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 26, fontWeight: 800,
        fontFamily: "var(--font-montserrat)", letterSpacing: "-0.02em",
        marginBottom: 14, flexShrink: 0,
        boxShadow: "0 6px 18px rgba(22,22,32,0.10)",
        userSelect: "none",
      }}>
        {!master.photoUrl && initialsOf(master.fullName)}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: c.txtDark,
        letterSpacing: "-0.01em", lineHeight: 1.25,
        marginBottom: 8,
        fontFamily: "var(--font-montserrat)",
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        maxWidth: "100%",
      }}>{master.fullName}</div>

      {/* Specialization chips */}
      {visibleRoles.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 4,
          justifyContent: "center", marginBottom: 12,
        }}>
          {visibleRoles.map(role => (
            <span key={role} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 12,
              background: c.primarySft, color: c.primary,
              fontSize: 11, fontWeight: 600,
              fontFamily: "var(--font-montserrat)",
            }}>
              {ROLE_ICONS[role] && <span aria-hidden style={{ fontSize: 12 }}>{ROLE_ICONS[role]}</span>}
              {role}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span style={{
              padding: "3px 9px", borderRadius: 12,
              background: c.bgSoft, color: c.txtMute,
              fontSize: 11, fontWeight: 600,
              fontFamily: "var(--font-montserrat)",
            }}>+{hiddenCount}</span>
          )}
        </div>
      )}

      {/* Phone */}
      {master.phone && (
        <a
          href={`tel:${master.phone}`}
          onClick={e => e.stopPropagation()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, color: c.txtBody, textDecoration: "none",
            padding: "5px 10px", borderRadius: 10,
            background: c.bgSoft,
            border: `1px solid ${c.borderSoft}`,
            marginTop: "auto",
            fontFamily: "var(--font-montserrat)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = c.border)}
          onMouseLeave={e => (e.currentTarget.style.background = c.bgSoft)}
        >
          <Ic d={I.phone} size={11} />
          {master.phone}
        </a>
      )}
    </div>
  );
}

export default function MastersPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; mode: "edit" | "create"; data?: MasterData | null }>({
    open: false, mode: "create", data: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    fetch("/api/partner/masters")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setMasters(d);
        else setLoadError(d?.error || "Не удалось загрузить");
      })
      .catch(() => setLoadError("Ошибка соединения"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Все уникальные роли из специализаций
  const allRoles = useMemo(() => {
    const set = new Set<string>();
    for (const m of masters) {
      for (const r of rolesList(m.specialization)) set.add(r);
    }
    return Array.from(set);
  }, [masters]);

  const filtered = useMemo(() => {
    return masters.filter(m => {
      if (filter && !rolesList(m.specialization).includes(filter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.fullName.toLowerCase().includes(q) &&
            !m.specialization.toLowerCase().includes(q) &&
            !(m.phone || "").includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [masters, filter, search]);

  function openCreate() { setEditor({ open: true, mode: "create", data: null }); }
  function openEdit(m: Master) { setEditor({ open: true, mode: "edit", data: m as MasterData }); }
  function closeEditor() { setEditor(p => ({ ...p, open: false })); }

  return (
    <div style={{ fontFamily: "var(--font-montserrat)" }}>
      {/* Header */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-start",
        justifyContent: "space-between", gap: 12, marginBottom: 18,
      }}>
        <div>
          <div style={{
            fontSize: 10, color: c.primary, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6,
          }}>Команда</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
            letterSpacing: "-0.02em",
          }}>Мастера</h1>
          <p style={{ fontSize: 13, color: c.txtMute, marginTop: 6 }}>
            {masters.length === 0
              ? "Пока нет мастеров"
              : `${masters.length} ${masters.length === 1 ? "мастер" : masters.length < 5 ? "мастера" : "мастеров"} в команде`}
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 20px", borderRadius: 12,
            background: c.primary, color: "#fff",
            border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 8px 22px rgba(123, 97, 255, 0.32)",
            transition: "background 0.15s, box-shadow 0.15s, transform 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = c.primaryDk;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 12px 28px rgba(123, 97, 255, 0.40)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = c.primary;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 22px rgba(123, 97, 255, 0.32)";
          }}
        >
          <Ic d={I.plus} size={16} />
          Добавить мастера
        </button>
      </div>

      {/* Search + Filters */}
      {masters.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 12, display: "flex", alignItems: "center",
            padding: "0 14px", gap: 10,
          }}>
            <Ic d={I.search} size={16} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Найти мастера..."
              style={{
                flex: 1, padding: "11px 0",
                border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: c.txtDark,
                fontFamily: "var(--font-montserrat)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Очистить"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: c.txtMute, padding: 4, display: "flex",
                }}
              >×</button>
            )}
          </div>

          {allRoles.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setFilter("")}
                style={{
                  padding: "7px 13px", borderRadius: 18,
                  background: !filter ? c.primary : c.bg,
                  color: !filter ? "#fff" : c.txtBody,
                  border: `1.5px solid ${!filter ? c.primary : c.border}`,
                  fontSize: 12, fontWeight: !filter ? 700 : 500,
                  cursor: "pointer", fontFamily: "var(--font-montserrat)",
                  transition: "all 0.15s",
                }}
              >Все · {masters.length}</button>
              {allRoles.map(role => {
                const count = masters.filter(m => rolesList(m.specialization).includes(role)).length;
                const active = filter === role;
                return (
                  <button
                    key={role}
                    onClick={() => setFilter(active ? "" : role)}
                    style={{
                      padding: "7px 13px", borderRadius: 18,
                      background: active ? c.primary : c.bg,
                      color: active ? "#fff" : c.txtBody,
                      border: `1.5px solid ${active ? c.primary : c.border}`,
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      cursor: "pointer", fontFamily: "var(--font-montserrat)",
                      display: "inline-flex", alignItems: "center", gap: 5,
                      transition: "all 0.15s",
                    }}
                  >
                    {ROLE_ICONS[role] && <span aria-hidden>{ROLE_ICONS[role]}</span>}
                    {role} · {count}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: c.txtMute, fontSize: 13 }}>
          Загрузка...
        </div>
      ) : loadError ? (
        <div style={{
          padding: "14px 18px", borderRadius: 14,
          background: c.redSft, border: `1px solid rgba(239,68,68,0.22)`,
          color: c.red, fontSize: 13, fontWeight: 600,
        }}>{loadError}</div>
      ) : masters.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 24,
          padding: "56px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 26,
            background: `linear-gradient(135deg, ${c.primarySft}, #DAD2F5)`,
            color: c.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
            boxShadow: "0 12px 32px rgba(123, 97, 255, 0.25)",
          }}>
            <Ic d={I.user} size={34} sw={1.6} />
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: c.txtDark,
            margin: "0 0 6px", letterSpacing: "-0.02em",
          }}>Соберите команду</h2>
          <p style={{
            fontSize: 13, color: c.txtMute,
            maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.55,
          }}>
            Добавьте мастеров с фото и специализациями — клиенты смогут выбирать к кому записаться
          </p>
          <button
            onClick={openCreate}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 12,
              background: c.primary, color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 700,
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 8px 22px rgba(123, 97, 255, 0.32)",
              transition: "background 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.primaryDk; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.primary; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Ic d={I.plus} size={16} />
            Добавить мастера
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18,
          padding: "40px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
            Ничего не найдено
          </div>
          <div style={{ fontSize: 12, color: c.txtMute }}>
            Попробуйте изменить запрос или сбросить фильтр
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}>
          {filtered.map(m => (
            <MasterCard key={m.id} master={m} onEdit={() => openEdit(m)} />
          ))}
        </div>
      )}

      {/* Editor */}
      <MasterEditor
        open={editor.open}
        mode={editor.mode}
        initial={editor.data}
        onClose={closeEditor}
        onSaved={() => setRefreshKey(k => k + 1)}
        onDeleted={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}
