import type { Metadata } from "next";
import { Playfair_Display, Inter, Montserrat } from "next/font/google";
import "../globals.css";
import RegistrationProvider from "../../components/RegistrationProvider";
import AuthSessionProvider from "../../components/AuthSessionProvider";

const playfairDisplay = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["100", "200", "300", "400"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Profit Club - Салон красоты",
  description: "Премиальный салон красоты Profit Club. Запись онлайн.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${montserrat.variable} ${playfairDisplay.variable}`}
        suppressHydrationWarning
      >
        <AuthSessionProvider>
          <RegistrationProvider>{children}</RegistrationProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
