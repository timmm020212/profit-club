import { notFound } from "next/navigation";
import { db } from "@/db";
import { salons, services, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

export const revalidate = 60;

export default async function SalonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [salon] = await db
    .select()
    .from(salons)
    .where(and(eq(salons.slug, slug), eq(salons.isActive, true)));

  if (!salon) notFound();

  const salonServices = await db
    .select()
    .from(services)
    .where(eq(services.salonId, salon.id));

  const salonMasters = await db
    .select({
      id: masters.id,
      fullName: masters.fullName,
      specialization: masters.specialization,
      photoUrl: masters.photoUrl,
    })
    .from(masters)
    .where(and(eq(masters.salonId, salon.id), eq(masters.isActive, true)));

  return (
    <main style={{ minHeight: "100vh", background: "#f7f7fa" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ececf0", padding: "20px 20px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 4 }}>{salon.name}</h1>
        {salon.city && (
          <p style={{ fontSize: 13, color: "#999" }}>
            {salon.city}{salon.address ? ` · ${salon.address}` : ""}
          </p>
        )}
        {salon.description && (
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, lineHeight: 1.5 }}>{salon.description}</p>
        )}
        {salon.phone && (
          <a
            href={`tel:${salon.phone}`}
            style={{ display: "inline-block", marginTop: 10, fontSize: 14, color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}
          >
            📞 {salon.phone}
          </a>
        )}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
        {/* Services */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 12 }}>Услуги</h2>
        {salonServices.length === 0 ? (
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>Услуги ещё не добавлены</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {salonServices.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#fff", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid #ececf0", display: "flex",
                  justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{s.name}</div>
                  {s.duration ? <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.duration} мин</div> : null}
                </div>
                {s.price && <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{s.price} ₽</div>}
              </div>
            ))}
          </div>
        )}

        {/* Masters */}
        {salonMasters.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 12 }}>Мастера</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {salonMasters.map((m) => (
                <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, overflow: "hidden" }}>
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={m.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "👩‍💼"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.fullName}</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{m.specialization || ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <Link
          href={`/booking?salon=${slug}`}
          style={{
            display: "block", width: "100%", background: "#1a1a2e", color: "#fff",
            textAlign: "center", borderRadius: 14, padding: "16px",
            fontSize: 15, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em",
          }}
        >
          Записаться онлайн
        </Link>
      </div>
    </main>
  );
}
