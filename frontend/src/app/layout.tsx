import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "Presupuestos Bolivia 2026",
  description:
    "Observatorio Fiscal y Presupuestario de Entidades Territoriales Autónomas de Bolivia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-950 antialiased">
        <AppNav />

        {children}

        <footer className="border-t border-emerald-950 bg-emerald-950 px-6 py-8 text-center text-sm text-emerald-100">
          <p>
            <strong>© 2026 Presupuestos Bolivia</strong>
            {" · "}
            Observatorio Fiscal y Presupuestario de Entidades Territoriales Autónomas
          </p>

          <p className="mt-4">
            Desarrollado por{" "}
            <strong className="text-white">Jhonny Paul Pinto Phillips</strong>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-emerald-300">
            <a href="/metodologia" className="font-semibold hover:text-white">
              Metodología
            </a>

            <span className="text-emerald-700">·</span>

            <a href="/datos" className="font-semibold hover:text-white">
              Datos
            </a>

            <span className="text-emerald-700">·</span>

            <a
              href="https://github.com/paul-pinto/Presupuestos-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-white"
            >
              GitHub
            </a>

            <span className="text-emerald-700">·</span>

            <a
              href="https://github.com/paul-pinto/Presupuestos-2026/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-white"
            >
              Licencia
            </a>

            <span className="text-emerald-700">·</span>

            <a
              href="https://wa.me/15856670360"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-white"
              title="Contactar por WhatsApp: +1 585 667 0360"
            >
              Contacto
            </a>
          </div>

          <p className="mt-6 text-xs text-emerald-300">Versión 1.0.2</p>
        </footer>
      </body>
    </html>
  );
}
