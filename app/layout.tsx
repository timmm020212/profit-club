// Root layout — minimal, no <html>/<body> since route groups provide their own
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
