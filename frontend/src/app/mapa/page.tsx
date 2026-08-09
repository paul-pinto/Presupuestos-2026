"use client";

import dynamic from "next/dynamic";
import { ArrowRight, BarChart3, Map, Table2 } from "lucide-react";
import { AtlasButtonLink, AtlasCard, AtlasHero, AtlasPage } from "@/components/atlas-ui";

const MapaMunicipal = dynamic(() => import("@/components/MapaMunicipal"), {
  ssr: false,
});

export default function MapaPage() {
  return (
    <AtlasPage>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <AtlasHero
          eyebrow="Atlas Fiscal y Censal Bolivia 2026"
          title="Mapa territorial de presupuestos, población e indicadores fiscales"
          description="Exploración municipal y departamental de presupuestos ETA 2026, población INE 2024, autonomía fiscal estricta, dependencia TGN, coparticipación, IDH, IEHD, regalías, PIB per cápita 2021, pobreza NBI y Brecha bienestar-producto."
          tags={["SIGEP 2026", "INE 2024", "Municipios", "Departamentos", "Pacto Fiscal"]}
        />

        <AtlasCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Lectura rápida
          </p>

          <div className="mt-5 grid gap-4">
            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Map className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
              <div>
                <p className="font-semibold text-slate-950">Mapa interactivo</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Cambia entre vista municipal y departamental.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <BarChart3 className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
              <div>
                <p className="font-semibold text-slate-950">Ranking visible</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Ordena automáticamente el indicador seleccionado.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Table2 className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
              <div>
                <p className="font-semibold text-slate-950">Tabla territorial</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Base para análisis comparativo y pacto fiscal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <AtlasButtonLink href="/metodologia">
              Ver metodología
              <ArrowRight className="ml-2 h-4 w-4" />
            </AtlasButtonLink>
          </div>
        </AtlasCard>
      </div>

      <div className="mt-8">
        <MapaMunicipal />
      </div>
    </AtlasPage>
  );
}
