"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CostByCommuneChart,
  ProvinceBarChart,
} from "@/components/dashboard/Charts";
import { PROVINCE_COLORS, SECTEUR_SHORT } from "@/data/types";
import type { DashboardData, CommuneSummary, Project } from "@/data/types";

import {
  LayoutDashboard,
  Map,
  BarChart3,
  Droplets,
  Building2,
  TableIcon,
  ChevronRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Hash,
  LandPlot,
  Layers,
  MapPin,
  Maximize,
  Minimize,
  FileDown,
  ClipboardCheck,
  AlertTriangle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart as PieChartIcon,
} from "lucide-react";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent"),
  { ssr: false }
);

type ViewType = "overview" | "kenitra" | "sidi-kacem" | "sidi-slimane" | "rapport";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "kenitra", label: "Kénitra", icon: Building2 },
  { id: "sidi-kacem", label: "Sidi Kacem", icon: Building2 },
  { id: "sidi-slimane", label: "Sidi Slimane", icon: Building2 },
  { id: "rapport", label: "Rapport", icon: FileText },
];

const PROVINCE_MAP: Record<ViewType, string | null> = {
  overview: null,
  kenitra: "Kénitra",
  "sidi-kacem": "Sidi Kacem",
  "sidi-slimane": "Sidi Slimane",
  rapport: null,
};

const SECTEUR_DOT_COLORS: Record<string, string> = {
  "Assainissement & Drainage": "#ef4444",
  "Pistes agricoles": "#3b82f6",
  "Stations de pompage": "#f59e0b",
  "Réhabilitation équipements": "#10b981",
  "Génie civil": "#8b5cf6",
};

const CONVENTION_PDF: Record<string, string> = {
  "Kénitra": "/conventions/convention-kenitra.pdf",
  "Sidi Kacem": "/conventions/convention-sidi-kacem.pdf",
  "Sidi Slimane": "/conventions/convention-sidi-slimane.pdf",
};

// 30-color palette for communes (same as MapComponent)
const COMMUNE_PALETTE = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#d946ef", "#65a30d",
  "#dc2626", "#0891b2", "#c026d3", "#059669", "#ea580c",
  "#2563eb", "#db2777", "#0d9488", "#9333ea", "#ca8a04",
  "#7c3aed", "#16a34a", "#e4d214", "#4f46e5", "#a21caf",
];

// Province-matched KPI colors
const KENITRA_COLOR = { gradient: "from-blue-500 to-cyan-600", bgGradient: "from-blue-50 to-cyan-50", textColor: "text-blue-700", iconBg: "bg-blue-100", iconColor: "text-blue-600" };
const SIDI_KACEM_COLOR = { gradient: "from-red-500 to-rose-600", bgGradient: "from-red-50 to-rose-50", textColor: "text-red-700", iconBg: "bg-red-100", iconColor: "text-red-600" };
const SIDI_SLIMANE_COLOR = { gradient: "from-emerald-500 to-green-600", bgGradient: "from-emerald-50 to-green-50", textColor: "text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" };
const DEFAULT_KPI = { gradient: "from-violet-500 to-purple-600", bgGradient: "from-violet-50 to-purple-50", textColor: "text-violet-700", iconBg: "bg-violet-100", iconColor: "text-violet-600" };

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const communeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Trigger map resize when fullscreen toggles
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
    return () => clearTimeout(t);
  }, [mapFullscreen]);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
    fetch("/api/geojson")
      .then((res) => res.json())
      .then(setGeojsonData)
      .catch(console.error);
  }, []);

  const selectedProvince = PROVINCE_MAP[activeView];

  const filteredSummary = useMemo(() => {
    if (!data) return {} as Record<string, CommuneSummary>;
    return Object.entries(data.summary)
      .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, CommuneSummary>);
  }, [data, selectedProvince]);

  const filteredProjects = useMemo(() => {
    if (!data) return [] as Project[];
    return data.projects.filter(
      (p) => !selectedProvince || p.province === selectedProvince
    );
  }, [data, selectedProvince]);

  const totalCost = data
    ? (selectedProvince
        ? data.byProvince[selectedProvince]?.cout_total ?? data.totalCost
        : data.totalCost)
    : 0;

  const totalProjects = data
    ? (selectedProvince
        ? data.byProvince[selectedProvince]?.nb_projets ?? data.totalProjects
        : data.totalProjects)
    : 0;

  const totalCommunes = data
    ? (selectedProvince
        ? data.byProvince[selectedProvince]?.communes ?? Object.keys(data.summary).length
        : Object.keys(data.summary).length)
    : 0;

  const projectsByCommune = useMemo(() => {
    return filteredProjects.reduce<Record<string, Project[]>>((acc, p) => {
      const key = p.commune;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [filteredProjects]);

  const communeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const sortedNames = Object.keys(projectsByCommune).sort((a, b) => {
      const totalA = projectsByCommune[a].reduce((s, p) => s + p.cout, 0);
      const totalB = projectsByCommune[b].reduce((s, p) => s + p.cout, 0);
      return totalB - totalA;
    });
    sortedNames.forEach((name, i) => {
      map[name] = COMMUNE_PALETTE[i % COMMUNE_PALETTE.length];
    });
    return map;
  }, [projectsByCommune]);

  const handleCommuneClick = useCallback((commune: string) => {
    setSelectedCommune(commune);
    setTimeout(() => {
      const el = communeRefs.current[commune];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
    setTimeout(() => {
      setSelectedCommune(null);
    }, 4000);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <Droplets className="h-14 w-14 text-blue-500 mx-auto animate-pulse" />
            <div className="absolute -inset-4 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="mt-6 text-lg font-semibold text-gray-700">
            Chargement du dashboard...
          </p>
          <p className="mt-1 text-sm text-gray-400">SIG Gharb - Projets Inondations</p>
        </div>
      </div>
    );
  }

  const getKpiColors = (index: number) => {
    if (selectedProvince) {
      if (selectedProvince === "Kénitra") return [KENITRA_COLOR, KENITRA_COLOR, KENITRA_COLOR, KENITRA_COLOR][index];
      if (selectedProvince === "Sidi Kacem") return [SIDI_KACEM_COLOR, SIDI_KACEM_COLOR, SIDI_KACEM_COLOR, SIDI_KACEM_COLOR][index];
      if (selectedProvince === "Sidi Slimane") return [SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR][index];
    }
    return [KENITRA_COLOR, SIDI_KACEM_COLOR, SIDI_SLIMANE_COLOR, DEFAULT_KPI][index];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-[68px]"
        } bg-gradient-to-b from-[#0c1222] via-[#111a2e] to-[#0c1222] text-white flex flex-col shrink-0 border-r border-white/[0.06] transition-all duration-300 ease-in-out relative`}
      >
        <div className="p-3 flex items-center justify-between border-b border-white/[0.06]">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg shadow-lg shadow-emerald-500/20 shrink-0">
                <Droplets className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight truncate">SIG Gharb</h1>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Inondations 2026</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${
              sidebarOpen ? "ml-auto" : "mx-auto"
            } p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white shrink-0`}
            title={sidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            let activeBg = "from-emerald-600 to-teal-600";
            let activeShadow = "shadow-emerald-600/25";
            if (item.id === "kenitra") { activeBg = "from-blue-600 to-cyan-600"; activeShadow = "shadow-blue-600/25"; }
            if (item.id === "sidi-kacem") { activeBg = "from-red-600 to-rose-600"; activeShadow = "shadow-red-600/25"; }
            if (item.id === "sidi-slimane") { activeBg = "from-emerald-600 to-green-600"; activeShadow = "shadow-emerald-600/25"; }
            if (item.id === "rapport") { activeBg = "from-amber-500 to-orange-600"; activeShadow = "shadow-amber-500/25"; }

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 ${
                  sidebarOpen ? "px-3" : "px-0 justify-center"
                } py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${activeBg} text-white shadow-lg ${activeShadow}`
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          {sidebarOpen ? (
            <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/10 rounded-xl p-3 text-center border border-emerald-500/10">
              <p className="text-[9px] text-emerald-400/80 uppercase tracking-widest font-bold">
                Total Gharb
              </p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {(totalCost / 1e6).toFixed(1)}
                <span className="text-sm font-bold ml-0.5">MDH</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {totalProjects} projets / {totalCommunes} communes
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[9px] text-emerald-400/60 font-bold">Total</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">
                {(totalCost / 1e6).toFixed(0)}M
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* Page Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {activeView === "overview" ? (
                  <>
                    <LayoutDashboard className="h-5 w-5 text-blue-600" />
                    ORMVAG - Tableau de bord
                  </>
                ) : activeView === "rapport" ? (
                  <>
                    <ClipboardCheck className="h-5 w-5 text-amber-600" />
                    Rapport d&apos;analyse
                  </>
                ) : (
                  <>
                    <Building2
                      className="h-5 w-5"
                      style={{ color: PROVINCE_COLORS[selectedProvince!] || "#6366f1" }}
                    />
                    Province de {selectedProvince}
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Projets d&apos;inondations - Région du Gharb - 2026
              </p>
            </div>
            <div className="flex gap-2">
              {activeView === "overview" &&
                Object.entries(PROVINCE_COLORS).map(([name, color]) => {
                  const provData = data.byProvince[name];
                  return (
                    <Badge
                      key={name}
                      style={{
                        backgroundColor: color + "18",
                        color: color,
                        borderColor: color + "30",
                      }}
                      className="text-xs px-3 py-1 border font-semibold"
                    >
                      {name}: {((provData?.cout_total ?? 0) / 1e6).toFixed(1)} MDH
                    </Badge>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* ===== RAPPORT VIEW ===== */}
          {activeView === "rapport" ? (
            <div className="space-y-6">
              {/* Rapport Header */}
              <Card className="overflow-hidden shadow-xl border-amber-200/60">
                <CardHeader className="py-5 px-6 bg-gradient-to-r from-amber-600 to-orange-600">
                  <CardTitle className="text-lg font-extrabold text-white flex items-center gap-3">
                    <ClipboardCheck className="h-6 w-6" />
                    Rapport d&apos;Analyse — Projets de Lutte contre les Inondations
                  </CardTitle>
                  <p className="text-amber-100 text-xs mt-1">Région du Gharb — ORMVAG — Année 2026</p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Ce rapport présente une analyse détaillée de l&apos;ensemble des projets de lutte contre les inondations
                    dans la région du Gharb, couvrant les trois provinces de Kénitra, Sidi Kacem et Sidi Slimane.
                    L&apos;objectif est d&apos;identifier les priorités d&apos;investissement, d&apos;évaluer la répartition géographique
                    et sectorielle des budgets, et de formuler des recommandations stratégiques pour optimiser
                    l&apos;allocation des ressources disponibles.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/60 text-center">
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Coût Global</p>
                      <p className="text-2xl font-black text-amber-700">{(data.totalCost / 1e6).toFixed(1)} <span className="text-sm">MDH</span></p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/60 text-center">
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Projets</p>
                      <p className="text-2xl font-black text-blue-700">{data.totalProjects}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/60 text-center">
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Communes</p>
                      <p className="text-2xl font-black text-emerald-700">{Object.keys(data.summary).length}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/60 text-center">
                      <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest mb-1">Secteurs</p>
                      <p className="text-2xl font-black text-purple-700">{Object.keys(data.bySecteur).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 1. Analyse par Province */}
              <Card className="overflow-hidden shadow-lg border-slate-200/60">
                <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    1. Analyse comparative par province
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    La répartition des investissements entre les trois provinces révèle des disparités significatives
                    qui reflètent à la fois l&apos;étendue des besoins en infrastructure et la densité des zones à risque
                    inondation dans chaque province. L&apos;analyse des écarts budgétaires permet d&apos;identifier les provinces
                    nécessitant une attention prioritaire en matière de renforcement des ouvrages de protection.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(data.byProvince).sort(([, a], [, b]) => b.cout_total - a.cout_total).map(([name, d]) => {
                      const pct = data.totalCost > 0 ? (d.cout_total / data.totalCost) * 100 : 0;
                      const avgCost = d.nb_projets > 0 ? d.cout_total / d.nb_projets : 0;
                      const provColor = PROVINCE_COLORS[name] || "#6366f1";
                      const isTop = pct === Math.max(...Object.values(data.byProvince).map(p => data.totalCost > 0 ? (p.cout_total / data.totalCost) * 100 : 0));
                      return (
                        <div key={name} className="rounded-xl border-2 p-4 space-y-3 transition-shadow hover:shadow-lg" style={{ borderColor: provColor + "40", backgroundColor: provColor + "08" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: provColor }} />
                              <span className="text-sm font-extrabold text-slate-800">{name}</span>
                            </div>
                            {isTop && (
                              <Badge className="text-[8px] font-bold px-2 py-0.5 border-0 bg-amber-100 text-amber-700">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" /> Dominante
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-slate-500 font-semibold">Budget alloué</span>
                              <span className="text-sm font-black" style={{ color: provColor }}>{(d.cout_total / 1e6).toFixed(1)} MDH</span>
                            </div>
                            <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                              <div className="h-full rounded-full shadow-sm" style={{ width: `${pct}%`, backgroundColor: provColor }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] font-bold text-slate-600">{pct.toFixed(1)}% du total</span>
                              <span className="text-[10px] text-slate-400">{d.nb_projets} projets / {d.communes} communes</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-slate-100 mt-1">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Coût moyen / projet</p>
                            <p className="text-sm font-black text-slate-800">{(avgCost / 1e6).toFixed(2)} MDH</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const provEntries = Object.entries(data.byProvince).sort(([, a], [, b]) => b.cout_total - a.cout_total);
                    const maxPct = data.totalCost > 0 ? (provEntries[0][1].cout_total / data.totalCost) * 100 : 0;
                    const minPct = data.totalCost > 0 ? (provEntries[provEntries.length - 1][1].cout_total / data.totalCost) * 100 : 0;
                    const ecart = maxPct - minPct;
                    return (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/60 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800 mb-1">Constat clé — Disparité inter-provinciale</p>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            L&apos;écart entre la province la plus dotée ({provEntries[0][0]}, {maxPct.toFixed(1)}%) et la moins dotée
                            ({provEntries[provEntries.length - 1][0]}, {minPct.toFixed(1)}%) est de <strong>{ecart.toFixed(1)} points</strong>.
                            Cet écart reflète une concentration des investissements sur les zones les plus vulnérables, mais
                            souligne également la nécessité de renforcer les infrastructures dans les provinces à faible couverture.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 2. Analyse par Secteur */}
              <Card className="overflow-hidden shadow-lg border-slate-200/60">
                <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                    <Layers className="h-4 w-4 text-amber-400" />
                    2. Analyse sectorielle des investissements
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    L&apos;analyse sectorielle met en évidence la répartition des budgets entre les cinq grands secteurs
                    d&apos;intervention. Cette ventilation permet d&apos;identifier les domaines prioritaires et de vérifier
                    l&apos;adéquation entre les investissements et les risques identifiés sur le terrain. Les secteurs
                    d&apos;assainissement et de drainage concentrent logiquement la part la plus importante des budgets,
                    reflétant la nature hydrologique des enjeux dans la plaine du Gharb.
                  </p>
                  <div className="space-y-3">
                    {Object.entries(data.bySecteur)
                      .sort(([, a], [, b]) => b.cout_total - a.cout_total)
                      .map(([name, d]) => {
                        const shortName = SECTEUR_SHORT[name] || name;
                        const dotColor = SECTEUR_DOT_COLORS[shortName] || "#94a3b8";
                        const pct = data.totalCost > 0 ? (d.cout_total / data.totalCost) * 100 : 0;
                        const avgCost = d.nb_projets > 0 ? d.cout_total / d.nb_projets : 0;
                        return (
                          <div key={name} className="rounded-xl border p-4" style={{ borderColor: dotColor + "30", backgroundColor: dotColor + "06" }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: dotColor }} />
                                <span className="text-sm font-extrabold text-slate-800">{shortName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black" style={{ color: dotColor }}>{(d.cout_total / 1e6).toFixed(1)} MDH</span>
                                <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: dotColor + "15", color: dotColor }}>
                                  {pct.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200/80 rounded-full h-4 overflow-hidden shadow-inner mb-2">
                              <div className="h-full rounded-full shadow-sm transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: dotColor }} />
                            </div>
                            <div className="flex gap-4 text-[10px] text-slate-500 font-semibold">
                              <span>{d.nb_projets} projets</span>
                              <span>{d.communes} communes</span>
                              <span>Coût moyen: {(avgCost / 1e6).toFixed(2)} MDH/projet</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {(() => {
                    const secteurEntries = Object.entries(data.bySecteur).sort(([, a], [, b]) => b.cout_total - a.cout_total);
                    const topSecteur = secteurEntries[0];
                    const topPct = data.totalCost > 0 ? (topSecteur[1].cout_total / data.totalCost) * 100 : 0;
                    return (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200/60 flex items-start gap-3">
                        <Target className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-blue-800 mb-1">Secteur prédominant</p>
                          <p className="text-[11px] text-blue-700 leading-relaxed">
                            Le secteur <strong>{SECTEUR_SHORT[topSecteur[0]] || topSecteur[0]}</strong> capte à lui seul
                            <strong> {topPct.toFixed(1)}%</strong> du budget total avec <strong>{topSecteur[1].nb_projets} projets</strong> pour
                            un montant de <strong>{(topSecteur[1].cout_total / 1e6).toFixed(1)} MDH</strong>. Cette dominance
                            s&apos;explique par la vocation agricole de la région du Gharb, où le réseau d&apos;assainissement
                            et de drainage constitue l&apos;infrastructure critique pour la gestion des eaux de crue et la
                            protection des terres agricoles.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 3. Top Communes */}
              <Card className="overflow-hidden shadow-lg border-slate-200/60">
                <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    3. Classement des communes par effort d&apos;investissement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Le classement des communes selon le montant total des investissements révéle une concentration
                    marquée des budgets sur un nombre réduit de communes. Les communes les mieux dotées correspondent
                    généralement aux zones les plus exposées aux risques d&apos;inondation, situées dans les bassins versants
                    principaux de l&apos;Oued Sebou et ses affluents. Cette concentration est justifiée par l&apos;ampleur des
                    travaux nécessaires pour protéger les populations et les infrastructures agricoles.
                  </p>
                  {(() => {
                    const allCommunes = Object.entries(data.summary)
                      .map(([name, d]) => ({ name, ...d }))
                      .sort((a, b) => b.cout_total - a.cout_total);
                    const top5 = allCommunes.slice(0, 5);
                    const top5Cost = top5.reduce((s, d) => s + d.cout_total, 0);
                    const top5Pct = data.totalCost > 0 ? (top5Cost / data.totalCost) * 100 : 0;
                    const avgCost = data.totalProjects > 0 ? data.totalCost / data.totalProjects : 0;
                    return (
                      <>
                        <div className="space-y-2">
                          {top5.map((d, idx) => {
                            const pct = data.totalCost > 0 ? (d.cout_total / data.totalCost) * 100 : 0;
                            const commColor = communeColorMap[d.name] || "#6366f1";
                            const provColor = PROVINCE_COLORS[d.province] || "#6366f1";
                            return (
                              <div key={d.name} className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 hover:shadow-md transition-shadow" style={{ borderLeftWidth: "4px", borderLeftColor: commColor }}>
                                <span className="text-lg font-black text-slate-300 w-8 text-center shrink-0">#{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-extrabold text-slate-800 truncate">{d.name}</span>
                                    <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: provColor + "18", color: provColor }}>{d.province}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-200/80 rounded-full h-2.5 overflow-hidden shadow-inner">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: commColor }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 w-10 text-right">{pct.toFixed(1)}%</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-emerald-600">{(d.cout_total / 1e6).toFixed(2)} MDH</p>
                                  <p className="text-[10px] text-slate-400">{d.nb_projets} projets</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/60 flex items-start gap-3">
                          <Activity className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-emerald-800 mb-1">Concentration des investissements</p>
                            <p className="text-[11px] text-emerald-700 leading-relaxed">
                              Les 5 communes les mieux dotées concentrent <strong>{top5Pct.toFixed(1)}%</strong> du budget total
                              ({(top5Cost / 1e6).toFixed(1)} MDH sur {(data.totalCost / 1e6).toFixed(1)} MDH). Le coût moyen par projet
                              à l&apos;échelle régionale s&apos;élève à <strong>{(avgCost / 1e6).toFixed(2)} MDH</strong>. Cette concentration
                              traduit la priorisation des zones les plus vulnérables, mais appelle une vigilance pour
                              maintenir un niveau d&apos;investissement minimal dans les communes moins dotées.
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 4. Indicateurs de performance */}
              <Card className="overflow-hidden shadow-lg border-slate-200/60">
                <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    4. Indicateurs clés de performance (KPI)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Les indicateurs ci-dessous offrent une vue synthétique de l&apos;effort d&apos;investissement à l&apos;échelle
                    régionale. Ils permettent de mesurer l&apos;intensité de la dépense par commune et par projet, ainsi que
                    la diversité sectorielle des interventions. Ces métriques sont essentielles pour le pilotage
                    stratégique du programme et l&apos;évaluation de son efficacité.
                  </p>
                  {(() => {
                    const nbCommunes = Object.keys(data.summary).length;
                    const nbSecteurs = Object.keys(data.bySecteur).length;
                    const avgCostPerCommune = nbCommunes > 0 ? data.totalCost / nbCommunes : 0;
                    const avgCostPerProject = data.totalProjects > 0 ? data.totalCost / data.totalProjects : 0;
                    const maxCommuneCost = Math.max(...Object.values(data.summary).map(d => d.cout_total));
                    const minCommuneCost = Math.min(...Object.values(data.summary).map(d => d.cout_total));
                    const maxMinRatio = minCommuneCost > 0 ? maxCommuneCost / minCommuneCost : 0;
                    const kpis = [
                      { label: "Coût moyen / commune", value: `${(avgCostPerCommune / 1e6).toFixed(2)} MDH`, color: "#3b82f6", icon: LandPlot },
                      { label: "Coût moyen / projet", value: `${(avgCostPerProject / 1e6).toFixed(2)} MDH`, color: "#10b981", icon: Hash },
                      { label: "Projets / commune", value: (data.totalProjects / nbCommunes).toFixed(1), color: "#f59e0b", icon: MapPin },
                      { label: "Ratio max/min (commune)", value: `×${maxMinRatio.toFixed(1)}`, color: "#ef4444", icon: AlertTriangle },
                      { label: "Couverture sectorielle", value: `${nbSecteurs} secteurs`, color: "#8b5cf6", icon: Layers },
                      { label: "Densité investissement", value: `${(data.totalCost / 1e6 / nbCommunes).toFixed(2)} MDH/commune`, color: "#06b6d4", icon: Activity },
                    ];
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {kpis.map((kpi) => (
                          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + "15" }}>
                                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{kpi.label}</span>
                            </div>
                            <p className="text-lg font-black text-slate-800">{kpi.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Coût Global" value={`${(totalCost / 1e6).toFixed(1)} MDH`} icon={TrendingUp} {...getKpiColors(0)} />
            <KPICard title="Projets" value={totalProjects.toString()} icon={Hash} {...getKpiColors(1)} />
            <KPICard title="Communes" value={totalCommunes.toString()} icon={LandPlot} {...getKpiColors(2)} />
            <KPICard
              title="Secteurs"
              value={
                activeView === "overview"
                  ? Object.keys(data.bySecteur).length.toString()
                  : Object.keys(filteredSummary).length > 0
                  ? new Set(Object.values(filteredSummary).flatMap((d) => Object.keys(d.rubriques))).size.toString()
                  : "0"
              }
              icon={Layers}
              {...getKpiColors(3)}
            />
          </div>

          {/* Convention PDF download */}
          {selectedProvince && CONVENTION_PDF[selectedProvince] && (
            <div className="flex justify-end">
              <a
                href={CONVENTION_PDF[selectedProvince]!}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border shadow-sm transition-all hover:shadow-md"
                style={{
                  backgroundColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "10",
                  color: PROVINCE_COLORS[selectedProvince] || "#6366f1",
                  borderColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "30",
                }}
              >
                <FileDown className="h-4 w-4" />
                Convention {selectedProvince}
              </a>
            </div>
          )}

          {/* MAP */}
          <Card className={`${mapFullscreen ? "fixed inset-0 z-50 h-screen rounded-none border-0" : activeView === "overview" ? "h-[900px]" : "h-[700px]"} !py-0 !gap-0 overflow-hidden shadow-md border-slate-200/60 transition-all duration-300`}>
            <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <Map className="h-4 w-4 text-blue-500" />
                  {activeView === "overview" ? "Carte - Région du Gharb" : `Carte - Province ${selectedProvince}`}
                </CardTitle>
                <button
                  onClick={() => setMapFullscreen(!mapFullscreen)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-500 hover:text-slate-800"
                  title={mapFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                  {mapFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0" style={{ height: mapFullscreen ? "calc(100vh - 44px)" : "calc(100% - 44px)" }}>
              <MapComponent
                geojsonData={geojsonData}
                selectedCommune={selectedCommune}
                selectedProvince={selectedProvince}
                onCommuneClick={handleCommuneClick}
                projectsByCommune={projectsByCommune}
                communeColorMap={communeColorMap}
              />
            </CardContent>
          </Card>

          {/* ===== SUMMARY TABLE + BAR CHART ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Summary Table - Premium Style */}
            <Card className="overflow-hidden shadow-lg border-slate-200/60">
              <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <TableIcon className="h-4 w-4 text-amber-400" />
                  Résumé par commune
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
                        <TableHead className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">
                          Commune
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider text-right py-3">
                          Projets
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider text-right py-3">
                          Coût (MDH)
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider text-right py-3">
                          Répartition
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider py-3">
                          Secteur principal
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const summaryTotalCost = Object.values(filteredSummary).reduce((s, d) => s + d.cout_total, 0);
                        const summaryTotalProjects = Object.values(filteredSummary).reduce((s, d) => s + d.nb_projets, 0);
                        const sorted = Object.entries(filteredSummary).sort(([, a], [, b]) => b.cout_total - a.cout_total);
                        return (
                          <>
                            {sorted.map(([name, d], idx) => {
                              const topSecteur = Object.entries(d.rubriques).sort(([, a], [, b]) => b - a)[0]?.[0] || "";
                              const shortSecteur = SECTEUR_SHORT[topSecteur] || topSecteur.substring(0, 20);
                              const coutPct = summaryTotalCost > 0 ? (d.cout_total / summaryTotalCost) * 100 : 0;
                              const commColor = communeColorMap[name] || "#6366f1";
                              return (
                                <TableRow
                                  key={name}
                                  className={`border-b border-slate-100 transition-all duration-200 ${
                                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                  } hover:bg-blue-50/60 hover:shadow-sm`}
                                  style={{ borderLeftWidth: "3px", borderLeftColor: commColor }}
                                >
                                  <TableCell className="text-xs font-bold py-3 text-slate-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/50" style={{ backgroundColor: commColor }} />
                                      {name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3">
                                    <Badge
                                      className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm"
                                      style={{ backgroundColor: commColor + "18", color: commColor }}
                                    >
                                      {d.nb_projets}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3 font-extrabold" style={{ color: "#059669" }}>
                                    {(d.cout_total / 1e6).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-3 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(coutPct, 100)}%`, backgroundColor: commColor }}
                                        />
                                      </div>
                                      <span className="font-bold text-[10px] text-slate-600 w-10 text-right">{coutPct.toFixed(1)}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs py-3">
                                    <span
                                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm"
                                      style={{
                                        backgroundColor: (SECTEUR_DOT_COLORS[shortSecteur] || "#94a3b8") + "15",
                                        color: SECTEUR_DOT_COLORS[shortSecteur] || "#94a3b8",
                                      }}
                                    >
                                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SECTEUR_DOT_COLORS[shortSecteur] || "#94a3b8" }} />
                                      {shortSecteur}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Total row */}
                            <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700 font-bold">
                              <TableCell className="text-xs font-extrabold py-3 text-white pl-4">Total</TableCell>
                              <TableCell className="text-xs text-right py-3">
                                <Badge className="bg-white/20 text-white text-[10px] font-bold px-2 border-0">{summaryTotalProjects}</Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-extrabold text-emerald-400 py-3">{(summaryTotalCost / 1e6).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right font-extrabold py-3 text-white">100%</TableCell>
                              <TableCell className="text-xs py-3"></TableCell>
                            </TableRow>
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="overflow-hidden shadow-lg border-slate-200/60">
              <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  Coût par commune (MDH)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CostByCommuneChart
                  summary={filteredSummary}
                  selectedProvince={selectedProvince}
                  selectedCommune={null}
                />
              </CardContent>
            </Card>
          </div>

          {/* Province comparison (overview only) */}
          {activeView === "overview" && (
            <Card className="overflow-hidden shadow-lg border-slate-200/60">
              <CardHeader className="py-3 px-5 border-b bg-gradient-to-r from-slate-800 to-slate-700">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Comparaison par province
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ProvinceBarChart byProvince={data.byProvince} />
              </CardContent>
            </Card>
          )}

          {/* ===== DETAILED PROJECT TABLES - EACH COMMUNE ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4 py-3 px-5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700">
              <FileText className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Détail des projets par commune
                {selectedProvince && (
                  <Badge
                    className="text-[10px] font-semibold ml-1 border-0"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                  >
                    {selectedProvince}
                  </Badge>
                )}
              </h3>
            </div>
            <div className="space-y-4">
              {Object.entries(projectsByCommune)
                .sort(([, a], [, b]) => {
                  const totalA = a.reduce((s, p) => s + p.cout, 0);
                  const totalB = b.reduce((s, p) => s + p.cout, 0);
                  return totalB - totalA;
                })
                .map(([commune, projects]) => {
                  const communeTotal = projects.reduce((s, p) => s + p.cout, 0);
                  const communeData = filteredSummary[commune];
                  const commColor = communeColorMap[commune] || "#6366f1";
                  const isHighlighted = selectedCommune === commune;
                  return (
                    <div
                      key={commune}
                      ref={(el: HTMLDivElement | null) => { communeRefs.current[commune] = el; }}
                    >
                      <Card
                        className={`overflow-hidden shadow-lg transition-all duration-300 ${
                          isHighlighted ? "ring-2 ring-offset-2 scale-[1.005]" : ""
                        }`}
                        style={{
                          borderLeftWidth: "5px",
                          borderLeftColor: commColor,
                          ...(isHighlighted ? { "--tw-ring-color": commColor } as React.CSSProperties : {}),
                        }}
                      >
                        {/* Commune header - gradient with commune color */}
                        <CardHeader
                          className="py-3 px-5 border-b"
                          style={{
                            background: `linear-gradient(135deg, ${commColor}15 0%, ${commColor}08 100%)`,
                          }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-4 h-4 rounded-full shadow-md ring-2 ring-white"
                                style={{ backgroundColor: commColor }}
                              />
                              <CardTitle className="text-sm font-extrabold text-slate-800">
                                {commune}
                              </CardTitle>
                              <Badge
                                className="text-[9px] font-bold px-2 py-0.5 border-0 shadow-sm"
                                style={{
                                  backgroundColor: commColor + "20",
                                  color: commColor,
                                }}
                              >
                                {communeData?.province}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm"
                                style={{ backgroundColor: commColor + "12", color: commColor }}
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                {projects.length} projets
                              </Badge>
                              <span
                                className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm"
                                style={{ backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}
                              >
                                {(communeTotal / 1e6).toFixed(2)} MDH
                              </span>
                              {(() => {
                                const provinceTotalForPct = filteredProjects.reduce((s, p) => s + p.cout, 0);
                                const communePct = provinceTotalForPct > 0 ? (communeTotal / provinceTotalForPct) * 100 : 0;
                                return (
                                  <span
                                    className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm"
                                    style={{ backgroundColor: commColor + "12", color: commColor, border: `1px solid ${commColor}25` }}
                                  >
                                    {communePct.toFixed(1)}%
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow style={{ backgroundColor: commColor + "10", borderBottomColor: commColor + "25" }}>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%]" style={{ color: commColor + "CC" }}>
                                    Rubrique
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%]" style={{ color: commColor + "CC" }}>
                                    Projet
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[27%]" style={{ color: commColor + "CC" }}>
                                    Consistance
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[13%]" style={{ color: commColor + "CC" }}>
                                    Coût (DH)
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[17%]" style={{ color: commColor + "CC" }}>
                                    Répartition
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {projects.map((p, i) => {
                                  const shortRub = SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique;
                                  const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
                                  const projPct = communeTotal > 0 ? (p.cout / communeTotal) * 100 : 0;
                                  return (
                                    <TableRow
                                      key={i}
                                      className={`border-b border-slate-100/80 transition-all duration-150 ${
                                        i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                      } hover:shadow-sm`}
                                      style={{ borderLeftWidth: "2px", borderLeftColor: dotColor + "40" }}
                                    >
                                      <TableCell className="text-[11px] py-2.5 align-top">
                                        <span
                                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full shadow-sm"
                                          style={{
                                            backgroundColor: dotColor + "15",
                                            color: dotColor,
                                          }}
                                        >
                                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                          {shortRub}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2.5 align-top text-slate-700 font-medium">
                                        {p.intitule_projet || <span className="text-slate-300">—</span>}
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2.5 align-top text-slate-500 leading-relaxed">
                                        {p.consistance || <span className="text-slate-300">—</span>}
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2.5 align-top text-right">
                                        <span className="font-extrabold px-2 py-1 rounded-md text-[11px]" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                                          {p.cout.toLocaleString("fr-FR")}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2.5 align-top text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <div className="w-14 h-2.5 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                                            <div
                                              className="h-full rounded-full transition-all duration-500"
                                              style={{ width: `${Math.min(projPct, 100)}%`, backgroundColor: dotColor }}
                                            />
                                          </div>
                                          <span className="font-bold text-[9px] text-slate-600 w-10 text-right">{projPct.toFixed(1)}%</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Total row */}
                                <TableRow style={{ background: `linear-gradient(135deg, ${commColor}20, ${commColor}08)` }}>
                                  <TableCell className="text-[11px] font-extrabold py-2.5 text-slate-700" colSpan={3}>Total {commune}</TableCell>
                                  <TableCell className="text-[11px] text-right font-extrabold py-2.5" style={{ color: "#059669" }}>
                                    {(communeTotal / 1e6).toFixed(2)} MDH
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right font-extrabold py-2.5 text-slate-600">100%</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ===== ANALYSE PAR RUBRIQUE - Province View ===== */}
          {selectedProvince && (
            <div>
              <div className="flex items-center gap-2 mb-4 py-3 px-5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-700">
                <Layers className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  Analyse par rubrique
                  <Badge
                    className="text-[10px] font-semibold ml-1 border-0"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.15)",
                      color: "#fff",
                    }}
                  >
                    {selectedProvince}
                  </Badge>
                </h3>
              </div>
              <div className="space-y-4">
                {(() => {
                  const projectsByRubrique = filteredProjects.reduce<Record<string, { projects: Project[]; cout: number }>>((acc, p) => {
                    const key = p.intitule_rubrique;
                    if (!acc[key]) acc[key] = { projects: [], cout: 0 };
                    acc[key].projects.push(p);
                    acc[key].cout += p.cout;
                    return acc;
                  }, {});

                  const provinceTotal = filteredProjects.reduce((s, p) => s + p.cout, 0);
                  const sortedRubriques = Object.entries(projectsByRubrique).sort(([, a], [, b]) => b.cout - a.cout);

                  return sortedRubriques.map(([rubrique, { projects, cout }]) => {
                    const shortRub = SECTEUR_SHORT[rubrique] || rubrique;
                    const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
                    const pct = provinceTotal > 0 ? (cout / provinceTotal) * 100 : 0;

                    const communesInRubrique = projects.reduce<Record<string, { cout: number; count: number }>>((acc, p) => {
                      if (!acc[p.commune]) acc[p.commune] = { cout: 0, count: 0 };
                      acc[p.commune].cout += p.cout;
                      acc[p.commune].count += 1;
                      return acc;
                    }, {});
                    const sortedCommunes = Object.entries(communesInRubrique).sort(([, a], [, b]) => b.cout - a.cout);

                    const avgCost = projects.length > 0 ? cout / projects.length : 0;
                    const topCommune = sortedCommunes[0];
                    const topCommunePct = topCommune ? (topCommune[1].cout / cout) * 100 : 0;

                    return (
                      <Card
                        key={rubrique}
                        className="overflow-hidden shadow-lg border-slate-200/60"
                        style={{ borderLeftWidth: "5px", borderLeftColor: dotColor }}
                      >
                        <CardHeader
                          className="py-3 px-5 border-b"
                          style={{ background: `linear-gradient(135deg, ${dotColor}15 0%, ${dotColor}08 100%)` }}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-4 h-4 rounded-full shadow-md ring-2 ring-white shrink-0" style={{ backgroundColor: dotColor }} />
                              <CardTitle className="text-sm font-extrabold text-slate-800">{shortRub}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: dotColor + "12", color: dotColor }}>
                                {projects.length} projets
                              </Badge>
                              <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm" style={{ backgroundColor: dotColor + "12", color: dotColor, border: `1px solid ${dotColor}25` }}>
                                {(cout / 1e6).toFixed(2)} MDH
                              </span>
                              <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5">
                          {/* Progress bar */}
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-slate-500 font-semibold">Part dans le budget provincial</span>
                              <span className="text-[11px] font-extrabold" style={{ color: dotColor }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                              <div className="h-full rounded-full transition-all duration-500 shadow-sm" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: dotColor }} />
                            </div>
                          </div>

                          {/* Analysis KPIs */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût moyen / projet</p>
                              <p className="text-base font-black text-slate-800">{(avgCost / 1e6).toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">MDH</span></p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Communes concernées</p>
                              <p className="text-base font-black text-slate-800">{sortedCommunes.length}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Commune dominante</p>
                              <p className="text-base font-black" style={{ color: dotColor }}>{topCommune ? topCommune[0] : "—"}</p>
                              {topCommune && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{(topCommune[1].cout / 1e6).toFixed(2)} MDH ({topCommunePct.toFixed(1)}%)</p>
                              )}
                            </div>
                          </div>

                          {/* Communes breakdown bars */}
                          <div className="mb-5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Répartition par commune</p>
                            <div className="space-y-2">
                              {sortedCommunes.map(([commune, d], cIdx) => {
                                const cPct = (d.cout / cout) * 100;
                                const cColor = communeColorMap[commune] || dotColor;
                                return (
                                  <div key={commune} className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700 w-[140px] shrink-0 truncate">{commune}</span>
                                    <div className="flex-1 relative" style={{ height: "18px" }}>
                                      <div className="absolute inset-0 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{ width: `${cPct}%`, backgroundColor: cIdx === 0 ? cColor : cColor + "BB" }}
                                        />
                                      </div>
                                      {cPct > 20 ? (
                                        <span className="absolute inset-0 flex items-center pl-3 text-[9px] font-bold text-white pointer-events-none" style={{ maxWidth: `${cPct}%` }}>
                                          {(d.cout / 1e6).toFixed(2)} MDH
                                        </span>
                                      ) : (
                                        <span className="absolute top-0 flex items-center h-full text-[9px] font-bold pointer-events-none whitespace-nowrap" style={{ left: `calc(${cPct}% + 6px)`, color: cColor }}>
                                          {(d.cout / 1e6).toFixed(2)} MDH
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 w-[45px] text-right">{cPct.toFixed(1)}%</span>
                                    <Badge className="text-[9px] font-bold px-1.5 py-0 shrink-0 border-0 shadow-sm" style={{ backgroundColor: cColor + "15", color: cColor }}>
                                      {d.count}P
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Detail projects table */}
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Détail des projets</p>
                            <div className="overflow-x-auto rounded-lg border border-slate-200/60">
                              <Table>
                                <TableHeader>
                                  <TableRow style={{ backgroundColor: dotColor + "10", borderBottomColor: dotColor + "25" }}>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%]" style={{ color: dotColor + "CC" }}>Commune</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%]" style={{ color: dotColor + "CC" }}>Projet</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[35%]" style={{ color: dotColor + "CC" }}>Consistance</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[12%]" style={{ color: dotColor + "CC" }}>Coût (DH)</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[10%]" style={{ color: dotColor + "CC" }}>Répart.</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projects
                                    .sort((a, b) => b.cout - a.cout)
                                    .map((p, i) => {
                                      const projPct = cout > 0 ? (p.cout / cout) * 100 : 0;
                                      return (
                                        <TableRow
                                          key={i}
                                          className={`border-b border-slate-100/80 transition-all duration-150 ${
                                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                          } hover:shadow-sm`}
                                          style={{ borderLeftWidth: "2px", borderLeftColor: dotColor + "30" }}
                                        >
                                          <TableCell className="text-[11px] py-2.5 align-top font-semibold text-slate-700">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: communeColorMap[p.commune] || "#94a3b8" }} />
                                              {p.commune}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2.5 align-top text-slate-700 font-medium">
                                            {p.intitule_projet || <span className="text-slate-300">—</span>}
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2.5 align-top text-slate-500 leading-relaxed">
                                            {p.consistance || <span className="text-slate-300">—</span>}
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2.5 align-top text-right">
                                            <span className="font-extrabold px-2 py-1 rounded-md text-[11px]" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                                              {p.cout.toLocaleString("fr-FR")}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2.5 align-top text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <div className="w-10 h-2 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                                                <div className="h-full rounded-full" style={{ width: `${Math.min(projPct, 100)}%`, backgroundColor: dotColor }} />
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-500 w-9 text-right">{projPct.toFixed(1)}%</span>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  <TableRow style={{ background: `linear-gradient(135deg, ${dotColor}20, ${dotColor}08)` }}>
                                    <TableCell className="text-[11px] font-extrabold py-2.5 text-slate-700" colSpan={3}>Total {shortRub}</TableCell>
                                    <TableCell className="text-[11px] text-right font-extrabold py-2.5" style={{ color: "#059669" }}>
                                      {(cout / 1e6).toFixed(2)} MDH
                                    </TableCell>
                                    <TableCell className="text-[11px] text-right font-extrabold py-2.5 text-slate-600">100%</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ===== ANALYSE PAR RUBRIQUE - Overview ===== */}
          {activeView === "overview" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Analyse par rubrique
                </h3>
              </div>
              <div className="space-y-6">
                {Object.entries(PROVINCE_COLORS).map(([provinceName, provColor]) => {
                  const provProjects = data.projects.filter(p => p.province === provinceName);
                  const provTotal = provProjects.reduce((s, p) => s + p.cout, 0);

                  const rubriquesInProvince = provProjects.reduce<Record<string, { cout: number; count: number; projects: Project[] }>>((acc, p) => {
                    const key = p.intitule_rubrique;
                    if (!acc[key]) acc[key] = { cout: 0, count: 0, projects: [] };
                    acc[key].cout += p.cout;
                    acc[key].count += 1;
                    acc[key].projects.push(p);
                    return acc;
                  }, {});

                  const sortedRubriques = Object.entries(rubriquesInProvince).sort(([, a], [, b]) => b.cout - a.cout);
                  const nbCommunes = new Set(provProjects.map(p => p.commune)).size;

                  return (
                    <Card
                      key={provinceName}
                      className="overflow-hidden shadow-lg border-slate-200/60"
                      style={{ borderLeftWidth: "5px", borderLeftColor: provColor }}
                    >
                      <CardHeader
                        className="py-3 px-5 border-b"
                        style={{ background: `linear-gradient(135deg, ${provColor}18 0%, ${provColor}08 100%)` }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-4 h-4 rounded-full shadow-md ring-2 ring-white" style={{ backgroundColor: provColor }} />
                            <CardTitle className="text-sm font-extrabold text-slate-800">{provinceName}</CardTitle>
                            <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: provColor + "20", color: provColor }}>
                              {provProjects.length} projets
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: provColor + "12", color: provColor }}>
                              {nbCommunes} communes
                            </Badge>
                            <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm" style={{ backgroundColor: provColor + "12", color: provColor, border: `1px solid ${provColor}25` }}>
                              {(provTotal / 1e6).toFixed(2)} MDH
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5">
                        {sortedRubriques.map(([rubrique, d], rIdx) => {
                          const shortRub = SECTEUR_SHORT[rubrique] || rubrique;
                          const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
                          const pct = provTotal > 0 ? (d.cout / provTotal) * 100 : 0;
                          const avgCost = d.count > 0 ? d.cout / d.count : 0;

                          const communesInRubrique = d.projects.reduce<Record<string, { cout: number; count: number }>>((acc, p) => {
                            if (!acc[p.commune]) acc[p.commune] = { cout: 0, count: 0 };
                            acc[p.commune].cout += p.cout;
                            acc[p.commune].count += 1;
                            return acc;
                          }, {});
                          const sortedCommunes = Object.entries(communesInRubrique).sort(([, a], [, b]) => b.cout - a.cout);
                          const topCommune = sortedCommunes[0];
                          const topCommunePct = topCommune ? (topCommune[1].cout / d.cout) * 100 : 0;

                          return (
                            <div key={rubrique} className={rIdx > 0 ? "mt-6 pt-6 border-t-2 border-slate-200/50" : ""}>
                              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-4 h-4 rounded-full shadow-md ring-2 ring-white shrink-0" style={{ backgroundColor: dotColor }} />
                                  <span className="text-sm font-extrabold text-slate-800">{shortRub}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: dotColor + "12", color: dotColor }}>
                                    {d.count} projets
                                  </Badge>
                                  <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm" style={{ backgroundColor: dotColor + "12", color: dotColor, border: `1px solid ${dotColor}25` }}>
                                    {(d.cout / 1e6).toFixed(2)} MDH
                                  </span>
                                  <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">Part dans le budget provincial</span>
                                  <span className="text-[11px] font-extrabold" style={{ color: dotColor }}>{pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                                  <div className="h-full rounded-full transition-all duration-500 shadow-sm" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: dotColor }} />
                                </div>
                              </div>

                              {/* Analysis KPIs */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût moyen / projet</p>
                                  <p className="text-base font-black text-slate-800">{(avgCost / 1e6).toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">MDH</span></p>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Communes concernées</p>
                                  <p className="text-base font-black text-slate-800">{sortedCommunes.length}</p>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-sm">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Commune dominante</p>
                                  <p className="text-base font-black" style={{ color: dotColor }}>{topCommune ? topCommune[0] : "—"}</p>
                                  {topCommune && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{(topCommune[1].cout / 1e6).toFixed(2)} MDH ({topCommunePct.toFixed(1)}%)</p>
                                  )}
                                </div>
                              </div>

                              {/* Communes breakdown bars */}
                              <div className="mb-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Répartition par commune</p>
                                <div className="space-y-2">
                                  {sortedCommunes.map(([commune, cData], cIdx) => {
                                    const cPct = (cData.cout / d.cout) * 100;
                                    const cColor = communeColorMap[commune] || dotColor;
                                    return (
                                      <div key={commune} className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-700 w-[140px] shrink-0 truncate">{commune}</span>
                                        <div className="flex-1 relative" style={{ height: "18px" }}>
                                          <div className="absolute inset-0 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div
                                              className="h-full rounded-full transition-all duration-500"
                                              style={{ width: `${cPct}%`, backgroundColor: cIdx === 0 ? cColor : cColor + "BB" }}
                                            />
                                          </div>
                                          {cPct > 20 ? (
                                            <span className="absolute inset-0 flex items-center pl-3 text-[9px] font-bold text-white pointer-events-none" style={{ maxWidth: `${cPct}%` }}>
                                              {(cData.cout / 1e6).toFixed(2)} MDH
                                            </span>
                                          ) : (
                                            <span className="absolute top-0 flex items-center h-full text-[9px] font-bold pointer-events-none whitespace-nowrap" style={{ left: `calc(${cPct}% + 6px)`, color: cColor }}>
                                              {(cData.cout / 1e6).toFixed(2)} MDH
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 w-[45px] text-right">{cPct.toFixed(1)}%</span>
                                        <Badge className="text-[9px] font-bold px-1.5 py-0 shrink-0 border-0 shadow-sm" style={{ backgroundColor: cColor + "15", color: cColor }}>
                                          {cData.count}P
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Detail projects table */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Détail des projets</p>
                                <div className="overflow-x-auto rounded-lg border border-slate-200/60">
                                  <Table>
                                    <TableHeader>
                                      <TableRow style={{ backgroundColor: dotColor + "10", borderBottomColor: dotColor + "25" }}>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%]" style={{ color: dotColor + "CC" }}>Commune</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%]" style={{ color: dotColor + "CC" }}>Projet</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[35%]" style={{ color: dotColor + "CC" }}>Consistance</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[12%]" style={{ color: dotColor + "CC" }}>Coût (DH)</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[10%]" style={{ color: dotColor + "CC" }}>Répart.</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {d.projects
                                        .sort((a, b) => b.cout - a.cout)
                                        .map((p, i) => {
                                          const projPct = d.cout > 0 ? (p.cout / d.cout) * 100 : 0;
                                          return (
                                            <TableRow
                                              key={i}
                                              className={`border-b border-slate-100/80 transition-all duration-150 ${
                                                i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                              } hover:shadow-sm`}
                                              style={{ borderLeftWidth: "2px", borderLeftColor: dotColor + "30" }}
                                            >
                                              <TableCell className="text-[11px] py-2.5 align-top font-semibold text-slate-700">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: communeColorMap[p.commune] || "#94a3b8" }} />
                                                  {p.commune}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-[11px] py-2.5 align-top text-slate-700 font-medium">
                                                {p.intitule_projet || <span className="text-slate-300">—</span>}
                                              </TableCell>
                                              <TableCell className="text-[11px] py-2.5 align-top text-slate-500 leading-relaxed">
                                                {p.consistance || <span className="text-slate-300">—</span>}
                                              </TableCell>
                                              <TableCell className="text-[11px] py-2.5 align-top text-right">
                                                <span className="font-extrabold px-2 py-1 rounded-md text-[11px]" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                                                  {p.cout.toLocaleString("fr-FR")}
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-[11px] py-2.5 align-top text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  <div className="w-10 h-2 rounded-full bg-slate-200/80 overflow-hidden shadow-inner">
                                                    <div className="h-full rounded-full" style={{ width: `${Math.min(projPct, 100)}%`, backgroundColor: dotColor }} />
                                                  </div>
                                                  <span className="text-[9px] font-bold text-slate-500 w-9 text-right">{projPct.toFixed(1)}%</span>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      <TableRow style={{ background: `linear-gradient(135deg, ${dotColor}20, ${dotColor}08)` }}>
                                        <TableCell className="text-[11px] font-extrabold py-2.5 text-slate-700" colSpan={3}>Total {shortRub}</TableCell>
                                        <TableCell className="text-[11px] text-right font-extrabold py-2.5" style={{ color: "#059669" }}>
                                          {(d.cout / 1e6).toFixed(2)} MDH
                                        </TableCell>
                                        <TableCell className="text-[11px] text-right font-extrabold py-2.5 text-slate-600">100%</TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  gradient,
  bgGradient,
  textColor,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  textColor: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className={`border-0 shadow-md overflow-hidden bg-gradient-to-br ${bgGradient}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {title}
            </p>
            <p className={`text-2xl font-black mt-1 ${textColor}`}>{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg} shadow-sm`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${gradient} mt-3 opacity-60`} />
      </CardContent>
    </Card>
  );
}
