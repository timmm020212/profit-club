import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Profit Club — Мастер",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" />
      <div className="min-h-screen bg-[#FAFAFA] font-[var(--font-montserrat)]">
        {children}
      </div>
    </>
  );
}
