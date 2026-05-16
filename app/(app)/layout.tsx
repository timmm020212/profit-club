import type { Metadata } from "next";
import RegistrationProvider from "../../components/RegistrationProvider";
import AuthSessionProvider from "../../components/AuthSessionProvider";

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
    <AuthSessionProvider>
      <RegistrationProvider>{children}</RegistrationProvider>
    </AuthSessionProvider>
  );
}
