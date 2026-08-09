import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "Presupuestos Bolivia 2026",
  description:
    "Explorador pÃºblico de presupuestos ETA Bolivia 2026 con datos SIGEP procesados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
