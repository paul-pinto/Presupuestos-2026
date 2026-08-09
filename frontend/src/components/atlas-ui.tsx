import Link from "next/link";
import type { ReactNode } from "react";

export function AtlasPage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen ofp-map-bg text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        {children}
      </div>
    </main>
  );
}

export function AtlasHero({
  eyebrow,
  title,
  description,
  tags = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  tags?: string[];
}) {
  return (
    <section className="ofp-atlas-card ofp-map-hero-accent relative overflow-hidden rounded-[2rem] p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-56 w-56 rounded-full bg-teal-200/20 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-teal-700">
          {eyebrow}
        </p>

        <h1 className="mt-4 max-w-5xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
          {title}
        </h1>

        <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600 lg:text-lg">
          {description}
        </p>

        {tags.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AtlasCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ofp-atlas-card rounded-[2rem] ${className}`}>
      {children}
    </div>
  );
}

export function AtlasMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="ofp-atlas-card rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-950">
        {value}
      </p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AtlasButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="ofp-button-primary inline-flex items-center rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 hover:shadow-md"
    >
      {children}
    </Link>
  );
}
