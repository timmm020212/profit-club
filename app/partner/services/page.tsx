"use client";
import { useEffect, useState, useMemo } from "react";
import ServiceEditor, { ServiceData } from "@/components/partner/ServiceEditor";

// ── tokens ──
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
  plus:  "M12 5v14M5 12h14",
  image: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  edit:  "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  search:"M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  cut:   "M6 3a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6zM8.12 8.12L12 12M12 12l7.88 7.88M20.12 3.88L12 12",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Парикмахерские услуги": "✂️",
  "Ногтевой сервис":       "💅",
  "Массаж":                "💆",
  "Косметология":          "✨",
  "Фитнес":                "🏋️",
  "Брови и ресницы":       "👁️",
  "Эпиляция":              "🌟",
  "СПА":                   "🌿",
  "Перманентный макияж":   "🎨",
};

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  accent:   { bg: "#B2223C", color: "#fff" },
  discount: { bg: "#059669", color: "#fff" },
  dark:     { bg: "#18181B", color: "#fff" },
  light:    { bg: "#FFFFFF", color: "#18181B" },
};

interface Service {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  duration: number | null;
  imageUrl: string | null;
  category: string | null;
  executorRole: string | null;
  badgeText: string | null;
  badgeType: string | null;
}

function priceClean(p: string | null): string {
  if (!p) return "—";
  return p; // already formatted "1500 ₽"
}

function ServiceCard({
  service, onEdit,
}: { service: Service; onEdit: () => void }) {
  const badge = service.badgeText && service.badgeType
    ? BADGE_STYLES[service.badgeType] || null
    : null;

  return (
    <div
      role="button" tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === "Enter") onEdit(); }}
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 18, overflow: "hidden",
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        transition: "transform 0.15s ease, box-shadow 0.18s ease, border-color 0.15s ease",
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
      {/* Image */}
      <div style={{
        position: "relative",
        width: "100%", aspectRatio: "16/10",
        background: service.imageUrl
          ? `url(${service.imageUrl}) center/cover`
          : `linear-gradient(135deg, ${c.bgSoft} 0%, ${c.primarySft} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!service.imageUrl && (
          <div style={{ color: c.txtMute, opacity: 0.7 }}>
            <Ic d={I.image} size={32} sw={1.5} />
          </div>
        )}
        {badge && service.badgeText && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            padding: "5px 11px", borderRadius: 14,
            background: badge.bg, color: badge.color,
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.04em",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            fontFamily: "var(--font-montserrat)",
          }}>{service.badgeText}</div>
        )}
        {service.category && CATEGORY_ICONS[service.category] && (
          <div style={{
            position: "absolute", top: 12, left: 12,
            padding: "5px 10px 5px 8px", borderRadius: 14,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            fontSize: 11, fontWeight: 600, color: c.txtDark,
            display: "inline-flex", alignItems: "center", gap: 5,
            boxShadow: "0 2px 6px rgba(22,22,32,0.06)",
            fontFamily: "var(--font-montserrat)",
          }}>
            <span aria-hidden style={{ fontSize: 13 }}>{CATEGORY_ICONS[service.category]}</span>
            {service.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: c.txtDark,
          letterSpacing: "-0.01em", lineHeight: 1.25,
          fontFamily: "var(--font-montserrat)",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{service.name}</div>

        {service.description && (
          <div style={{
            fontSize: 12, color: c.txtMute, lineHeight: 1.4,
            fontFamily: "var(--font-montserrat)",
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>{service.description}</div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: "auto", paddingTop: 8,
          borderTop: `1px solid ${c.borderSoft}`,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)",
          }}>
            <Ic d={I.clock} size={13} />
            {service.duration ? `${service.duration} мин` : "—"}
          </div>
          <div style={{
            fontSize: 16, fontWeight: 800, color: c.primary,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-montserrat)",
          }}>{priceClean(service.price)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; mode: "edit" | "create"; data?: ServiceData | null }>({
    open: false, mode: "create", data: null,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    fetch("/api/partner/services")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setServices(d);
        else setLoadError(d?.error || "Не удалось загрузить");
      })
      .catch(() => setLoadError("Ошибка соединения"))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Categories present in the data (for filter chips)
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) if (s.category) set.add(s.category);
    return Array.from(set);
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (filter && s.category !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !(s.description || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [services, filter, search]);

  function openCreate() {
    setEditor({ open: true, mode: "create", data: null });
  }
  function openEdit(s: Service) {
    setEditor({ open: true, mode: "edit", data: s as ServiceData });
  }
  function closeEditor() {
    setEditor(p => ({ ...p, open: false }));
  }

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
          }}>Прайс-лист</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
            letterSpacing: "-0.02em",
          }}>Услуги</h1>
          <p style={{ fontSize: 13, color: c.txtMute, marginTop: 6 }}>
            {services.length === 0 ? "Пока нет услуг" : `${services.length} ${services.length === 1 ? "услуга" : services.length < 5 ? "услуги" : "услуг"} в каталоге`}
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
          Добавить услугу
        </button>
      </div>

      {/* Search + Filter */}
      {services.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <div style={{
            position: "relative",
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 12, display: "flex", alignItems: "center",
            padding: "0 14px", gap: 10,
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}>
            <Ic d={I.search} size={16} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Найти услугу..."
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

          {categories.length > 0 && (
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
              >Все · {services.length}</button>
              {categories.map(cat => {
                const count = services.filter(s => s.category === cat).length;
                const active = filter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilter(active ? "" : cat)}
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
                    {CATEGORY_ICONS[cat] && <span aria-hidden>{CATEGORY_ICONS[cat]}</span>}
                    {cat} · {count}
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
      ) : services.length === 0 ? (
        /* Empty state */
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
            <Ic d={I.cut} size={34} sw={1.6} />
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: c.txtDark,
            margin: "0 0 6px", letterSpacing: "-0.02em",
          }}>Создайте первую услугу</h2>
          <p style={{
            fontSize: 13, color: c.txtMute,
            maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.55,
          }}>
            Добавьте услуги с ценой, длительностью и фото — клиенты увидят их на странице записи
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
            Добавить услугу
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* No matches */
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
        /* Grid */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {filtered.map(s => (
            <ServiceCard key={s.id} service={s} onEdit={() => openEdit(s)} />
          ))}
        </div>
      )}

      {/* Editor */}
      <ServiceEditor
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
