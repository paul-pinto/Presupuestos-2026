"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  BarChart3,
  Building2,
  Database,
  Download,
  FileText,
  Landmark,
  Map,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const links = [
  {
    href: "/",
    label: "Resumen",
    icon: Database,
  },
  {
    href: "/entidades",
    label: "Entidades",
    icon: Building2,
  },
  {
    href: "/gastos",
    label: "Gastos",
    icon: BarChart3,
  },
  {
    href: "/ingresos",
    label: "Ingresos",
    icon: WalletCards,
  },
  {
    href: "/objeto-gasto",
    label: "Objeto gasto",
    icon: Landmark,
  },
  {
    href: "/indicadores",
    label: "Indicadores",
    icon: BarChart3,
  },
  {
    href: "/brecha-bienestar-producto",
    label: "Brecha",
    icon: ActivitySquare,
  },
  {
    href: "/mapa",
    label: "Mapa",
    icon: Map,
  },
  {
    href: "/metodologia",
    label: "Metodología",
    icon: FileText,
  },
  {
    href: "/datos",
    label: "Datos",
    icon: Download,
  },
  {
    href: "/validacion",
    label: "Validación",
    icon: ShieldCheck,
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/30 bg-white/95 shadow-sm backdrop-blur">
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-950 to-teal-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Observatorio Fiscal y Presupuestario"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-sm">
              <Image
                src="/brand/observatorio-fiscal-logo.jpeg"
                alt="Observatorio Fiscal y Presupuestario para las Entidades Territoriales Autónomas de Bolivia"
                fill
                priority
                sizes="48px"
                className="object-cover"
              />
            </div>

            <div className="leading-tight">
              <p className="text-base font-bold text-white">
                Observatorio Fiscal y Presupuestario
              </p>
              <p className="text-sm text-emerald-100">
                Entidades Territoriales Autónomas de Bolivia
              </p>
            </div>
          </Link>

          <div className="hidden flex-wrap items-center justify-end gap-3 lg:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/70 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-50">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Datos SIGEP 2026 procesados
            </span>

            <span className="rounded-full border border-emerald-700/70 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-50">
              INE 2024
            </span>

            <span className="rounded-full border border-emerald-700/70 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-50">
              Observatorio by Paul Pinto
            </span>
          </div>
        </div>
      </div>

      <nav className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3">
          {links.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border-emerald-950 bg-emerald-950 text-white shadow-sm"
                    : "border-transparent text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800",
                ].join(" ")}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
