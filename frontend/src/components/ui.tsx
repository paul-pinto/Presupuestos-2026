import Link from "next/link";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
          {eyebrow ? (
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}

export function Pill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
      {children}
    </span>
  );
}

export function DataLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-300/10"
    >
      {children}
    </Link>
  );
}
