import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Profit Club — Запись",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" />
      {children}
    </>
  );
}
