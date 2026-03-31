import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "../../globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["100", "200", "300", "400", "500", "600"],
  variable: "--font-montserrat",
});

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
    <html lang="ru">
      <body className={montserrat.variable}>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <div className="min-h-screen bg-[#FAFAFA] font-[var(--font-montserrat)]">
          {children}
        </div>
      </body>
    </html>
  );
}
