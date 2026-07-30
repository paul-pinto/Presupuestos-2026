import Link from "next/link";
import { ArrowLeft, Database, FileCheck2, GitBranch, ShieldCheck } from "lucide-react";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  );
}

export default function MetodologiaPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-wide text-slate-500">
            Presupuestos Bolivia 2026
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">MetodologÃ­a</h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            Esta pÃ¡gina resume la fuente, el proceso de transformaciÃ³n y las validaciones aplicadas
            para construir el observatorio pÃºblico de presupuestos ETA Bolivia 2026.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-8">
        <Card title="Fuente de datos">
          <p>
            La base corresponde a informaciÃ³n presupuestaria institucional de entidades territoriales
            autÃ³nomas para la gestiÃ³n 2026, procesada a partir de los archivos fuente recopilados del
            SIGEP Bolivia.
          </p>
          <p>
            La unidad principal de anÃ¡lisis es la entidad: municipio, gobernaciÃ³n u otra ETA presente
            en el universo procesado.
          </p>
        </Card>

        <Card title="Proceso de construcciÃ³n">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <Database size={22} />
              <p className="mt-2 font-semibold">1. ExtracciÃ³n</p>
              <p className="mt-1 text-xs">Lectura y normalizaciÃ³n de archivos fuente.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <GitBranch size={22} />
              <p className="mt-2 font-semibold">2. TransformaciÃ³n</p>
              <p className="mt-1 text-xs">Limpieza, homologaciÃ³n y armado de tablas analÃ­ticas.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <ShieldCheck size={22} />
              <p className="mt-2 font-semibold">3. ValidaciÃ³n</p>
              <p className="mt-1 text-xs">Cruce entre ingresos, gastos y objeto/fuente.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <FileCheck2 size={22} />
              <p className="mt-2 font-semibold">4. PublicaciÃ³n</p>
              <p className="mt-1 text-xs">ExportaciÃ³n a JSON estÃ¡tico para Next.js/Vercel.</p>
            </div>
          </div>
        </Card>

        <Card title="Capas analÃ­ticas">
          <ul className="list-disc space-y-2 pl-5">
            <li>Presupuesto por entidad, departamento, tipo y grupo ETA.</li>
            <li>Programas presupuestarios por entidad.</li>
            <li>Ingresos y recursos por rubro.</li>
            <li>Objeto del gasto y fuentes de financiamiento.</li>
            <li>ValidaciÃ³n integrada entre ingresos, gastos y objeto/fuente.</li>
          </ul>
        </Card>

        <Card title="ValidaciÃ³n integrada">
          <p>
            La validaciÃ³n compara los totales derivados de distintas vistas del presupuesto:
            ingresos por rubro, gastos por categorÃ­a/grupo y gasto por objeto/fuente.
          </p>
          <p>
            Se aplica una tolerancia operativa de Bs 1 para evitar falsos positivos por redondeos o
            diferencias menores de procesamiento.
          </p>
        </Card>

        <Card title="Limitaciones actuales">
          <ul className="list-disc space-y-2 pl-5">
            <li>Los datos publicados son estÃ¡ticos y se actualizan mediante exportaciÃ³n manual.</li>
            <li>La versiÃ³n actual se concentra en la gestiÃ³n 2026.</li>
            <li>Los indicadores de pacto fiscal, poblaciÃ³n, pobreza y redistribuciÃ³n serÃ¡n parte de una fase posterior.</li>
            <li>Algunas etiquetas provienen de la estructura original de los datos y pueden requerir limpieza visual adicional.</li>
          </ul>
        </Card>
      </section>
    </main>
  );
}
