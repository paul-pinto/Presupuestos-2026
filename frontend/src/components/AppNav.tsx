"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Database,
  Landmark,
  ShieldCheck,
  WalletCards,
  FileText,
  Download,
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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-950 p-2 text-white">
            <Database size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-950">
              Presupuestos Bolivia 2026
            </p>
            <p className="text-xs text-slate-500">SIGEP · ETA · Observatorio by Paul Pinto</p>
          </div>
        </Link>

        <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {links.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm transition",
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
