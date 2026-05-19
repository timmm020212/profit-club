import { notFound } from "next/navigation";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import BookingServicesGrid from "@/components/BookingServicesGrid";

export const dynamic = "force-dynamic";

// Слаги зарезервированные системой — не могут быть URL-ом салона
const RESERVED = new Set([
  "partner", "admin", "api", "login", "signup", "register",
  "salon", "booking", "miniapp", "profile", "telegram-webapp",
  "_next", "favicon.ico", "uploads", "media", "logo", "robots.txt",
  "sitemap.xml", "manifest.json", "static", "public", "www",
]);

export default async function SalonPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const salon = await dbRetry(async () => {
    const [row] = await db.select({
      id: salons.id,
      slug: salons.slug,
      name: salons.name,
      description: salons.description,
      city: salons.city,
      address: salons.address,
      phone: salons.phone,
      logoUrl: salons.logoUrl,
    }).from(salons).where(and(eq(salons.slug, slug), eq(salons.isActive, true)));
    return row;
  }).catch(() => null);

  if (!salon) notFound();

  const location = [salon.city, salon.address].filter(Boolean).join(" · ");

  return (
    <main
      style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff" }}
      suppressHydrationWarning
    >
      {/* Salon header */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "28px 24px 24px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 18 }}>
          {salon.logoUrl ? (
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              backgroundImage: `url(${salon.logoUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              border: "1px solid rgba(255,255,255,0.10)",
              flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: "linear-gradient(135deg, #7B61FF, #5B3FE5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-montserrat)",
              fontSize: 28, fontWeight: 800, color: "#fff",
              boxShadow: "0 10px 30px rgba(123, 97, 255, 0.35)",
              flexShrink: 0, letterSpacing: "-0.04em",
            }}>
              {salon.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "var(--font-montserrat)",
              fontSize: "clamp(22px, 3.5vw, 30px)",
              fontWeight: 800, letterSpacing: "-0.02em",
              margin: 0, lineHeight: 1.15,
            }}>
              {salon.name}
            </h1>
            {location && (
              <div style={{
                fontFamily: "var(--font-montserrat)", fontSize: 13,
                color: "rgba(255,255,255,0.55)", marginTop: 4,
              }}>{location}</div>
            )}
          </div>
          {salon.phone && (
            <a
              href={`tel:${salon.phone}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#fff", textDecoration: "none",
                fontFamily: "var(--font-montserrat)",
                fontSize: 13, fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 14 }}>📞</span>
              {salon.phone}
            </a>
          )}
        </div>
        {salon.description && (
          <p style={{
            maxWidth: 1100, margin: "14px auto 0",
            fontFamily: "var(--font-montserrat)",
            fontSize: 14, lineHeight: 1.6,
            color: "rgba(255,255,255,0.68)",
          }}>
            {salon.description}
          </p>
        )}
      </header>

      {/* Booking catalog — category filter pills with FLIP animations are inside the grid */}
      <section style={{ padding: "20px 24px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <BookingServicesGrid salon={slug} />
      </section>
    </main>
  );
}
