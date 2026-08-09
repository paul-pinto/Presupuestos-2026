"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Database,
  FileCheck2,
  GitBranch,
  Landmark,
  Map,
  Scale,
  ShieldCheck,
} from "lucide-react";

function SectionCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ofp-card rounded-3xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-sm font-bold text-teal-700">
          {number}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            Metodología
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
        {children}
      </div>
    </section>
  );
}

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">
      {children}
    </div>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
      {children}
    </div>
  );
}

function SourceCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="ofp-card rounded-3xl p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function MetodologiaPage() {
  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                DOCUMENTACIÓN · FUENTES · SUPUESTOS
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                Metodología del observatorio
              </h1>
              <p className="mt-4 max-w-5xl text-base leading-7 text-slate-600">
                Esta sección documenta las fuentes, cruces, supuestos y criterios utilizados
                para construir el observatorio fiscal y presupuestario de las Entidades
                Territoriales Autónomas de Bolivia. Incluye el procesamiento de datos SIGEP,
                la integración con población censal, la construcción de indicadores fiscales,
                la estimación de PIBpc municipal y el nuevo indicador de brecha bienestar-producto.
              </p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <FileCheck2 size={34} />
            </div>
          </div>
        </div>
      </section>

      <section className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SourceCard
            title="SIGEP 2026"
            description="Base presupuestaria procesada para ingresos, gastos, programas, objeto del gasto, fuentes de financiamiento y organismos financiadores."
            icon={<Database size={22} />}
          />
          <SourceCard
            title="Censo 2024"
            description="Población municipal y datos de Necesidades Básicas Insatisfechas utilizados para indicadores per cápita y rezago social."
            icon={<Landmark size={22} />}
          />
          <SourceCard
            title="PIBpc estimado"
            description="Estimación municipal propia construida a partir de grillas económicas, ponderadores poblacionales y benchmark departamental."
            icon={<Map size={22} />}
          />
          <SourceCard
            title="Pacto fiscal"
            description="Indicadores diseñados para comparar dependencia, autonomía, rezago, bienestar y capacidad territorial de las ETA."
            icon={<Scale size={22} />}
          />
        </div>

        <div className="mt-8 grid gap-6">
          <SectionCard number="01" title="Fuente presupuestaria SIGEP 2026">
            <p>
              La fuente principal del observatorio es la información presupuestaria institucional
              correspondiente a la gestión 2026. Los datos fueron procesados, normalizados y
              exportados a archivos públicos para su consulta desde el frontend.
            </p>

            <p>
              El procesamiento separa las principales dimensiones presupuestarias: entidades,
              departamentos, tipo de entidad territorial, grupo ETA, programas presupuestarios,
              ingresos, gastos, objeto del gasto, fuentes de financiamiento y organismos
              financiadores.
            </p>

            <NoteBox>
              El observatorio no modifica los montos presupuestarios originales. Las
              transformaciones aplicadas corresponden a limpieza, homologación de nombres,
              agregación territorial, validación y construcción de indicadores derivados.
            </NoteBox>
          </SectionCard>

          <SectionCard number="02" title="Entidades territoriales autónomas">
            <p>
              Las entidades se clasifican según su naturaleza institucional: gobiernos autónomos
              departamentales, municipales, regionales e indígena originario campesinos. Esta
              clasificación permite comparar presupuestos dentro de grupos equivalentes y evitar
              lecturas agregadas que mezclen instituciones con competencias distintas.
            </p>

            <p>
              Para el análisis territorial, cada entidad se cruza con departamento, código de
              entidad, nombre institucional, tipo de entidad y grupo ETA. En los casos donde fue
              necesario, se aplicaron equivalencias manuales para compatibilizar nombres entre
              fuentes presupuestarias, censales y geográficas.
            </p>
          </SectionCard>

          <SectionCard number="03" title="Población censal y presupuesto per cápita">
            <p>
              La población utilizada para los indicadores presupuestarios per cápita proviene del
              Censo de Población y Vivienda 2024. Esta variable permite comparar el tamaño relativo
              de los presupuestos entre territorios con poblaciones muy diferentes.
            </p>

            <FormulaBox>
              Presupuesto per cápita = presupuesto total de la entidad / población censal 2024
            </FormulaBox>

            <p>
              El indicador no representa ejecución presupuestaria ni gasto efectivo por persona.
              Mide el presupuesto institucional asignado o registrado para una entidad territorial
              dividido entre su población censal.
            </p>
          </SectionCard>

          <SectionCard number="04" title="Indicadores fiscales">
            <p>
              Los indicadores fiscales buscan medir la composición de los ingresos y el grado de
              dependencia o autonomía de cada entidad territorial. Se calculan como porcentajes
              sobre el total de ingresos presupuestados.
            </p>

            <FormulaBox>
              Dependencia TGN = transferencias TGN / ingresos totales
            </FormulaBox>

            <FormulaBox>
              Coparticipación = coparticipación tributaria / ingresos totales
            </FormulaBox>

            <FormulaBox>
              IDH = ingresos por IDH / ingresos totales
            </FormulaBox>

            <FormulaBox>
              Regalías = regalías / ingresos totales
            </FormulaBox>

            <p>
              Para gobiernos municipales y autonomías indígena originario campesinas, la autonomía
              fiscal estricta se aproxima con los recursos específicos de fuente 20 y organismo 210.
            </p>

            <FormulaBox>
              Autonomía fiscal estricta GAM/GAIOC = fuente 20 organismo 210 / ingresos totales
            </FormulaBox>

            <p>
              Para gobiernos autónomos departamentales se utiliza una lectura diferenciada de
              autonomía departamental, considerando rubros de ingresos departamentales relevantes.
            </p>

            <FormulaBox>
              Autonomía fiscal departamental = rubros 12 + 13 + 15 + 16 + 21 / ingresos totales
            </FormulaBox>

            <NoteBox>
              La autonomía fiscal estricta no pretende agotar toda la discusión sobre capacidad
              tributaria o financiera territorial. Es una aproximación operativa construida con
              clasificación presupuestaria disponible y criterios comparables entre entidades.
            </NoteBox>
          </SectionCard>

          <SectionCard number="05" title="Necesidades Básicas Insatisfechas 2024">
            <p>
              El componente social del observatorio incorpora información de pobreza por
              Necesidades Básicas Insatisfechas correspondiente al Censo 2024. Se utilizan los
              registros municipales y TIOC totales, evitando mezclar indebidamente filas urbanas y
              rurales en la agregación principal.
            </p>

            <p>
              El indicador de pobreza NBI mide privaciones estructurales asociadas a vivienda,
              servicios básicos, educación, salud y condiciones de vida. Por tanto, no debe
              confundirse con pobreza monetaria ni con ingreso corriente de los hogares.
            </p>

            <FormulaBox>
              Pobreza NBI = población pobre por NBI / población total del territorio
            </FormulaBox>
          </SectionCard>

          <SectionCard number="06" title="Estimación del PIB municipal 2021">
            <p>
              Bolivia no cuenta con una publicación oficial de PIB municipal comparable para todos
              los municipios. Por ello, el observatorio incorpora una estimación propia del PIB
              municipal 2021 construida mediante una metodología espacial y posteriormente
              ajustada con una estructura departamental de referencia.
            </p>

            <p>
              La referencia académica utilizada para la base económica espacial es el trabajo de
              <strong> Esteban Rossi-Hansberg y Jialing Zhang, “Local GDP Estimates Around the World”,
              NBER Working Paper No. 33458, 2025</strong>. Este paper desarrolla una base global de
              PIB local estimado en grillas de alta resolución, incluyendo resolución de
              <strong> 0,25 grados</strong>, con cobertura anual desde 2012 en adelante.
            </p>

            <p>
              En el procesamiento del observatorio se utilizó la variable
              <strong> predicted_GCP_const_2017_USD</strong>, que representa el producto bruto de
              celda estimado en <strong>miles de millones de dólares constantes de 2017</strong>.
              Para su uso municipal, este valor fue convertido a dólares constantes de 2017 y
              asignado espacialmente a los polígonos municipales de Bolivia.
            </p>

            <p>
              La geometría de cada celda se interpretó tomando sus coordenadas de longitud y
              latitud como la esquina inferior izquierda de una grilla de 0,25 grados. A partir de
              ello se construyó el polígono de celda correspondiente y se calculó su intersección
              con los municipios.
            </p>

            <p>
              Para distribuir la actividad económica de las celdas entre municipios se utilizó
              población espacial WorldPop 2021 como ponderador territorial. En términos prácticos,
              cuando una celda económica intersecta más de un municipio, el valor de esa celda se
              reparte según el peso poblacional espacial estimado dentro de cada intersección.
            </p>

            <NoteBox>
              La referencia de Rossi-Hansberg y Zhang se utiliza como insumo espacial para estimar
              actividad económica local. No corresponde a una publicación oficial de PIB municipal
              de Bolivia ni reemplaza las cuentas regionales oficiales del INE.
            </NoteBox>

            <FormulaBox>
              PIB municipal base = suma de fracciones de celdas económicas asignadas al municipio
            </FormulaBox>

            <NoteBox>
              La población WorldPop 2021 utilizada en esta etapa funciona como ponderador de
              distribución espacial, no como denominador público final del PIB per cápita.
            </NoteBox>
          </SectionCard>

          <SectionCard number="07" title="Benchmark departamental con estructura INE 2021">
            <p>
              Después de obtener una distribución municipal inicial, la estimación fue ajustada para
              respetar la estructura departamental del PIB publicada por el INE para 2021. Este paso
              evita que la distribución municipal agregada se aleje excesivamente de la composición
              departamental observada.
            </p>

            <p>
              El procedimiento conserva la distribución relativa entre municipios dentro de cada
              departamento, pero reescala el total departamental para que la participación de cada
              departamento sea consistente con la estructura departamental INE 2021.
            </p>

            <FormulaBox>
              PIB municipal benchmark = PIB municipal base × factor de ajuste departamental
            </FormulaBox>

            <p>
              La estructura departamental se usa como referencia de participación relativa entre
              departamentos. No se realiza una conversión mecánica de bolivianos a dólares a partir
              de cuentas encadenadas.
            </p>

            <NoteBox>
              Las medidas encadenadas son útiles para comparar estructuras y evolución real, pero no
              deben interpretarse como montos aditivos simples para convertir directamente a otra
              moneda. En esta metodología se emplean para construir participaciones departamentales
              normalizadas.
            </NoteBox>
          </SectionCard>

          <SectionCard number="08" title="Población retrospectiva intercensal 2021">
            <p>
              Para calcular el PIBpc municipal se evitó usar la población espacial del modelo como
              denominador final. En su lugar, se construyó una población retrospectiva 2021 basada en
              el crecimiento intercensal entre el Censo 2012 y el Censo 2024.
            </p>

            <FormulaBox>
              P2021 = P2012 × (P2024 / P2012) ^ (9 / 12)
            </FormulaBox>

            <p>
              Esta fórmula aproxima la población municipal de 2021 asumiendo una trayectoria
              geométrica entre ambos censos. La distancia temporal entre 2012 y 2024 es de doce
              años, y 2021 se ubica nueve años después de 2012.
            </p>

            <p>
              Esta población retrospectiva permite que el PIBpc se calcule con un denominador más
              coherente con la serie censal boliviana y no con una población reconstruida solamente
              para ponderación espacial.
            </p>
          </SectionCard>

          <SectionCard number="09" title="PIB per cápita municipal estimado 2021">
            <p>
              El PIBpc municipal estimado se calcula dividiendo el PIB municipal benchmarkeado por
              la población retrospectiva intercensal 2021. El resultado se expresa en USD constantes
              de 2017.
            </p>

            <FormulaBox>
              PIBpc municipal 2021 = PIB municipal benchmark 2021 / población retrospectiva 2021
            </FormulaBox>

            <p>
              Este indicador permite comparar la producción territorial estimada por habitante entre
              municipios. Sin embargo, no mide ingreso disponible de los hogares, salarios, consumo
              ni bienestar social directo.
            </p>

            <NoteBox>
              El PIBpc municipal mostrado en el observatorio es una estimación propia. No debe
              presentarse como PIB municipal oficial publicado por el INE.
            </NoteBox>
          </SectionCard>

          <SectionCard number="10" title="Brecha bienestar-producto">
            <p>
              La brecha bienestar-producto es un indicador sintético construido para identificar
              tensiones entre actividad económica territorial estimada y condiciones sociales
              básicas. Cruza el PIBpc municipal estimado 2021 con la pobreza por NBI 2024.
            </p>

            <p>
              La lectura principal es detectar territorios donde existe un producto por habitante
              relativamente alto, pero persisten niveles elevados de pobreza estructural. Estos
              casos son relevantes para discutir conversión del producto territorial en bienestar,
              asignación fiscal, provisión de servicios e inequidades espaciales.
            </p>

            <FormulaBox>
              Score de brecha = 0,55 × componente NBI + 0,45 × componente PIBpc
            </FormulaBox>

            <p>
              La clasificación territorial utilizada distingue entre producto alto con rezago
              social, producto medio con rezago social, rezago estructural, situaciones
              intermedias y territorios con mejor bienestar relativo.
            </p>

            <NoteBox>
              Una brecha alta no implica automáticamente error de datos. Puede reflejar economías
              territoriales concentradas, baja densidad poblacional, extracción de excedentes fuera
              del territorio, baja provisión de servicios o limitaciones propias de la estimación
              espacial.
            </NoteBox>
          </SectionCard>

          <SectionCard number="11" title="Validación y consistencia">
            <p>
              El observatorio incorpora un módulo de validación que contrasta ingresos, gastos y
              registros procesados para detectar diferencias relevantes. La validación permite
              revisar consistencia de totales y reducir errores antes de publicar indicadores
              agregados.
            </p>

            <p>
              También se realizaron auditorías de cruce entre fuentes para población, NBI, PIBpc,
              entidades SIGEP y capas geográficas. En los casos donde los nombres diferían entre
              fuentes, se utilizaron equivalencias manuales trazables.
            </p>
          </SectionCard>

          <SectionCard number="12" title="Limitaciones de interpretación">
            <p>
              El observatorio trabaja con datos presupuestarios, no con ejecución efectiva. Por
              tanto, los montos deben interpretarse como presupuestos registrados o asignados, no
              necesariamente como gasto devengado, pagado o ejecutado.
            </p>

            <p>
              Los indicadores per cápita dependen de la población utilizada como denominador. Para
              presupuesto per cápita se utiliza población censal 2024; para PIBpc estimado se usa
              población retrospectiva 2021.
            </p>

            <p>
              El PIBpc municipal es una estimación espacial propia. Es útil para análisis
              exploratorio, comparación territorial y discusión de pacto fiscal, pero no sustituye
              cuentas oficiales ni mediciones directas de ingreso de hogares.
            </p>

            <p>
              La pobreza NBI mide privaciones estructurales y no pobreza monetaria. Por ello, la
              comparación entre PIBpc y NBI debe interpretarse como una relación entre producto
              territorial estimado y bienestar básico, no como una comparación directa entre ingreso
              y pobreza.
            </p>
          </SectionCard>
        </div>

        <section className="mt-8 ofp-card rounded-3xl p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">
              <GitBranch size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Trazabilidad
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                Archivos públicos generados
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                El frontend consume archivos JSON y GeoJSON generados desde los scripts del
                proyecto. Entre ellos se incluyen entidades, presupuestos, ingresos, gastos,
                programas, objeto del gasto, indicadores fiscales, población, NBI, PIBpc estimado,
                brecha bienestar-producto y capas territoriales municipales y departamentales.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/datos"
                  className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                >
                  Ver catálogo de datos
                </Link>
                <Link
                  href="/validacion"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                >
                  Ver validación
                </Link>
                <Link
                  href="/brecha-bienestar-producto"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                >
                  Ver brecha bienestar-producto
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
