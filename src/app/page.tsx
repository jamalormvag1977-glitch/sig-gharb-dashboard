"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent"),
  { ssr: false }
);

type ViewType = "overview" | "kenitra" | "sidi-kacem" | "sidi-slimane";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "kenitra", label: "Kénitra", icon: Building2 },
  { id: "sidi-kacem", label: "Sidi Kacem", icon: Building2 },
  { id: "sidi-slimane", label: "Sidi Slimane", icon: Building2 },
];

const PROVINCE_MAP: Record<ViewType, string | null> = {
  overview: null,
  kenitra: "Kénitra",
  "sidi-kacem": "Sidi Kacem",
  "sidi-slimane": "Sidi Slimane",
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

  // Filter data by province
  const filteredSummary = Object.entries(data.summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, CommuneSummary>);

  const filteredProjects = data.projects.filter(
    (p) => !selectedProvince || p.province === selectedProvince
  );

  const totalCost = selectedProvince
    ? data.byProvince[selectedProvince]?.cout_total ?? data.totalCost
    : data.totalCost;

  const totalProjects = selectedProvince
    ? data.byProvince[selectedProvince]?.nb_projets ?? data.totalProjects
    : data.totalProjects;

  const totalCommunes = selectedProvince
    ? data.byProvince[selectedProvince]?.communes ?? Object.keys(data.summary).length
    : Object.keys(data.summary).length;

  // Group projects by commune for the detail table
  const projectsByCommune = filteredProjects.reduce<Record<string, Project[]>>((acc, p) => {
    const key = p.commune;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Get KPI color scheme based on selected province
  const getKpiColors = (index: number) => {
    if (selectedProvince) {
      // When a province is selected, use its color for all KPIs with variation
      if (selectedProvince === "Kénitra") return [KENITRA_COLOR, KENITRA_COLOR, KENITRA_COLOR, KENITRA_COLOR][index];
      if (selectedProvince === "Sidi Kacem") return [SIDI_KACEM_COLOR, SIDI_KACEM_COLOR, SIDI_KACEM_COLOR, SIDI_KACEM_COLOR][index];
      if (selectedProvince === "Sidi Slimane") return [SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR, SIDI_SLIMANE_COLOR][index];
    }
    // Overview: each KPI uses a different province color
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
        {/* Toggle button at top */}
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

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            // Color the active nav item with province color
            let activeBg = "from-emerald-600 to-teal-600";
            let activeShadow = "shadow-emerald-600/25";
            if (item.id === "kenitra") { activeBg = "from-blue-600 to-cyan-600"; activeShadow = "shadow-blue-600/25"; }
            if (item.id === "sidi-kacem") { activeBg = "from-red-600 to-rose-600"; activeShadow = "shadow-red-600/25"; }
            if (item.id === "sidi-slimane") { activeBg = "from-emerald-600 to-green-600"; activeShadow = "shadow-emerald-600/25"; }

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

        {/* Bottom total - removed province stats section */}
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
          {/* KPI Cards - colors match provinces */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Coût Global"
              value={`${(totalCost / 1e6).toFixed(1)} MDH`}
              icon={TrendingUp}
              {...getKpiColors(0)}
            />
            <KPICard
              title="Projets"
              value={totalProjects.toString()}
              icon={Hash}
              {...getKpiColors(1)}
            />
            <KPICard
              title="Communes"
              value={totalCommunes.toString()}
              icon={LandPlot}
              {...getKpiColors(2)}
            />
            <KPICard
              title="Secteurs"
              value={
                activeView === "overview"
                  ? Object.keys(data.bySecteur).length.toString()
                  : Object.keys(filteredSummary).length > 0
                  ? new Set(
                      Object.values(filteredSummary).flatMap((d) =>
                        Object.keys(d.rubriques)
                      )
                    ).size.toString()
                  : "0"
              }
              icon={Layers}
              {...getKpiColors(3)}
            />
          </div>

          {/* Convention PDF download buttons */}
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

          {/* MAP - full width (no pie chart) */}
          <Card className={`${mapFullscreen ? "fixed inset-0 z-50 h-screen rounded-none border-0" : activeView === "overview" ? "h-[900px]" : "h-[700px]"} !py-0 !gap-0 overflow-hidden shadow-md border-slate-200/60 transition-all duration-300`}>
            <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <Map className="h-4 w-4 text-blue-500" />
                  {activeView === "overview"
                    ? "Carte - Région du Gharb"
                    : `Carte - Province ${selectedProvince}`}
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
                selectedCommune={null}
                selectedProvince={selectedProvince}
                onCommuneClick={() => {}}
                projectsByCommune={projectsByCommune}
              />
            </CardContent>
          </Card>

          {/* TABLE + BAR CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Summary Table */}
            <Card className="overflow-hidden shadow-md border-slate-200/60">
              <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <TableIcon className="h-4 w-4 text-amber-500" />
                  Résumé par commune
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Commune
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                        Projets
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                        Coût (MDH)
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                        % Coût
                      </TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
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
                            const provColor = PROVINCE_COLORS[d.province] || "#999";
                            return (
                              <TableRow
                                key={name}
                                className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-blue-50/50`}
                              >
                                <TableCell className="text-xs font-semibold py-2.5 text-slate-800">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: provColor }} />
                                    {name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-right py-2.5">
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-1.5" variant="outline">
                                    {d.nb_projets}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right py-2.5 font-bold text-emerald-600">
                                  {(d.cout_total / 1e6).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-xs text-right py-2.5">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-12 h-2 rounded-full bg-slate-200 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${coutPct}%`, backgroundColor: provColor }} />
                                    </div>
                                    <span className="font-bold text-[10px] text-slate-600 w-10 text-right">{coutPct.toFixed(1)}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (SECTEUR_DOT_COLORS[shortSecteur] || "#999") + "15", color: SECTEUR_DOT_COLORS[shortSecteur] || "#999" }}>
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SECTEUR_DOT_COLORS[shortSecteur] || "#999" }} />
                                    {shortSecteur}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Total row */}
                          <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold border-t-2 border-slate-300">
                            <TableCell className="text-xs font-bold py-2.5 text-slate-700">Total</TableCell>
                            <TableCell className="text-xs text-right py-2.5">
                              <Badge className="bg-blue-600 text-white text-[10px] font-bold px-1.5">{summaryTotalProjects}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-700 py-2.5">{(summaryTotalCost / 1e6).toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right font-bold py-2.5 text-slate-600">100%</TableCell>
                            <TableCell className="text-xs py-2.5"></TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="overflow-hidden shadow-md border-slate-200/60">
              <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Coût par commune (MDH)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <CostByCommuneChart
                  summary={filteredSummary}
                  selectedProvince={selectedProvince}
                  selectedCommune={null}
                />
              </CardContent>
            </Card>
          </div>

          {/* Province comparison (only in overview) */}
          {activeView === "overview" && (
            <Card className="overflow-hidden shadow-md border-slate-200/60">
              <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Comparaison par province
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ProvinceBarChart byProvince={data.byProvince} />
              </CardContent>
            </Card>
          )}

          {/* DETAILED PROJECT TABLES - EACH COMMUNE IN ITS OWN CARD */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                Détail des projets par commune
                {selectedProvince && (
                  <Badge
                    className="text-[10px] font-semibold ml-2"
                    style={{
                      backgroundColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "15",
                      color: PROVINCE_COLORS[selectedProvince] || "#6366f1",
                      borderColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "30",
                    }}
                    variant="outline"
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
                  const provColor = communeData
                    ? PROVINCE_COLORS[communeData.province] || "#6366f1"
                    : "#6366f1";
                  return (
                    <Card
                      key={commune}
                      className="overflow-hidden shadow-md border-slate-200/60"
                      style={{ borderTopColor: provColor, borderTopWidth: "3px" }}
                    >
                      {/* Commune header inside card */}
                      <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shadow-sm"
                              style={{ backgroundColor: provColor }}
                            />
                            <CardTitle className="text-sm font-bold text-slate-800">
                              {commune}
                            </CardTitle>
                            <Badge
                              className="text-[9px] font-semibold px-1.5 py-0"
                              style={{
                                backgroundColor: provColor + "15",
                                color: provColor,
                                borderColor: provColor + "25",
                              }}
                              variant="outline"
                            >
                              {communeData?.province}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2" variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {projects.length} projets
                            </Badge>
                            <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {(communeTotal / 1e6).toFixed(2)} MDH
                            </span>
                            {(() => {
                              const provinceTotalForPct = filteredProjects.reduce((s, p) => s + p.cout, 0);
                              const communePct = provinceTotalForPct > 0 ? (communeTotal / provinceTotalForPct) * 100 : 0;
                              return (
                                <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                  {communePct.toFixed(1)}%
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/60 border-b border-slate-200">
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                                Rubrique
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">
                                Projet
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[28%]">
                                Consistance
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[12%]">
                                Coût (DH)
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">
                                % Coût
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
                                  className={`border-b border-slate-100 transition-colors ${
                                    i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                  } hover:bg-indigo-50/30`}
                                >
                                  <TableCell className="text-[11px] py-2.5 align-top">
                                    <span
                                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: dotColor + "12",
                                        color: dotColor,
                                      }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: dotColor }}
                                      />
                                      {shortRub}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-[11px] py-2.5 align-top text-slate-700 font-medium">
                                    {p.intitule_projet || (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-[11px] py-2.5 align-top text-slate-500 leading-relaxed">
                                    {p.consistance || (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-[11px] py-2.5 align-top text-right">
                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      {p.cout.toLocaleString("fr-FR")}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-[11px] py-2.5 align-top text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <div className="w-10 h-2 rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${projPct}%`, backgroundColor: dotColor }} />
                                      </div>
                                      <span className="font-bold text-[9px] text-slate-600 w-9 text-right">{projPct.toFixed(1)}%</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {/* Total row */}
                            <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold border-t-2 border-slate-300">
                              <TableCell className="text-[11px] font-bold py-2 text-slate-700" colSpan={3}>Total {commune}</TableCell>
                              <TableCell className="text-[11px] text-right font-bold text-emerald-700 py-2">
                                {(communeTotal / 1e6).toFixed(2)} MDH
                              </TableCell>
                              <TableCell className="text-[11px] text-right font-bold py-2 text-slate-600">100%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>

          {/* ANALYSE PAR RUBRIQUE - Province View */}
          {selectedProvince && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Analyse par rubrique
                  <Badge
                    className="text-[10px] font-semibold ml-2"
                    style={{
                      backgroundColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "15",
                      color: PROVINCE_COLORS[selectedProvince] || "#6366f1",
                      borderColor: (PROVINCE_COLORS[selectedProvince] || "#6366f1") + "30",
                    }}
                    variant="outline"
                  >
                    {selectedProvince}
                  </Badge>
                </h3>
              </div>
              <div className="space-y-4">
                {(() => {
                  // Group projects by rubrique for the selected province
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

                    // Group by commune within this rubrique
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
                        className="overflow-hidden shadow-md border-slate-200/60"
                        style={{ borderLeftColor: dotColor, borderLeftWidth: "4px" }}
                      >
                        <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: dotColor }} />
                              <CardTitle className="text-sm font-bold text-slate-800">{shortRub}</CardTitle>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2" variant="outline">
                                {projects.length} projets
                              </Badge>
                              <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] border" style={{ backgroundColor: dotColor + "12", color: dotColor, borderColor: dotColor + "30" }}>
                                {(cout / 1e6).toFixed(2)} MDH
                              </span>
                              <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-500 font-medium">Part dans le budget provincial</span>
                              <span className="text-[10px] font-bold" style={{ color: dotColor }}>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: dotColor }} />
                            </div>
                          </div>

                          {/* Analysis KPIs */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût moyen / projet</p>
                              <p className="text-sm font-black text-slate-800">{(avgCost / 1e6).toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">MDH</span></p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Communes concernées</p>
                              <p className="text-sm font-black text-slate-800">{sortedCommunes.length}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Commune dominante</p>
                              <p className="text-sm font-black" style={{ color: dotColor }}>{topCommune ? topCommune[0] : "—"}</p>
                              {topCommune && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{(topCommune[1].cout / 1e6).toFixed(2)} MDH ({topCommunePct.toFixed(1)}% de la rubrique)</p>
                              )}
                            </div>
                          </div>

                          {/* Communes breakdown bars */}
                          <div className="mb-4">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Répartition par commune</p>
                            <div className="space-y-2">
                              {sortedCommunes.map(([commune, d], cIdx) => {
                                const cPct = (d.cout / cout) * 100;
                                return (
                                  <div key={commune} className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700 w-[140px] shrink-0 truncate">{commune}</span>
                                    <div className="flex-1 relative" style={{ height: "16px" }}>
                                      <div className="absolute inset-0 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cPct}%`, backgroundColor: dotColor + (cIdx === 0 ? "" : "99") }} />
                                      </div>
                                      {cPct > 20 ? (
                                        <span className="absolute inset-0 flex items-center pl-2 text-[9px] font-bold text-white pointer-events-none" style={{ maxWidth: `${cPct}%` }}>
                                          {(d.cout / 1e6).toFixed(2)} MDH
                                        </span>
                                      ) : (
                                        <span className="absolute top-0 flex items-center h-full text-[9px] font-bold pointer-events-none whitespace-nowrap" style={{ left: `calc(${cPct}% + 6px)`, color: dotColor }}>
                                          {(d.cout / 1e6).toFixed(2)} MDH
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 w-[45px] text-right">{cPct.toFixed(1)}%</span>
                                    <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] font-bold px-1.5 py-0 shrink-0" variant="outline">
                                      {d.count}P
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Détail des projets avec consistance */}
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Détail des projets</p>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50/60 border-b border-slate-200">
                                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[18%]">Commune</TableHead>
                                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Projet</TableHead>
                                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[35%]">Consistance</TableHead>
                                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[12%]">Coût (DH)</TableHead>
                                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[10%]">% Rub.</TableHead>
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
                                      className={`border-b border-slate-100 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-indigo-50/30`}
                                    >
                                      <TableCell className="text-[11px] py-2 align-top font-semibold text-slate-700">
                                        {p.commune}
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2 align-top text-slate-700 font-medium">
                                        {p.intitule_projet || <span className="text-slate-300">—</span>}
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2 align-top text-slate-500 leading-relaxed">
                                        {p.consistance || <span className="text-slate-300">—</span>}
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2 align-top text-right">
                                        <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          {p.cout.toLocaleString("fr-FR")}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-[11px] py-2 align-top text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <div className="w-10 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${projPct}%`, backgroundColor: dotColor }} />
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-500">{projPct.toFixed(1)}%</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Total row */}
                                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold border-t-2 border-slate-300">
                                  <TableCell className="text-[11px] font-bold py-2 text-slate-700" colSpan={3}>Total {shortRub}</TableCell>
                                  <TableCell className="text-[11px] text-right font-bold text-emerald-700 py-2">
                                    {(cout / 1e6).toFixed(2)} MDH
                                  </TableCell>
                                  <TableCell className="text-[11px] text-right font-bold py-2 text-slate-600">100%</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ANALYSE PAR RUBRIQUE - Overview (all provinces) */}
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

                  // Group by rubrique for this province
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
                      className="overflow-hidden shadow-md border-slate-200/60"
                      style={{ borderTopColor: provColor, borderTopWidth: "3px" }}
                    >
                      <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: provColor }} />
                            <CardTitle className="text-sm font-bold text-slate-800">{provinceName}</CardTitle>
                            <Badge className="text-[9px] font-semibold px-1.5 py-0" style={{ backgroundColor: provColor + "15", color: provColor, borderColor: provColor + "25" }} variant="outline">
                              {provProjects.length} projets
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2" variant="outline">
                              {nbCommunes} communes
                            </Badge>
                            <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] border" style={{ backgroundColor: provColor + "12", color: provColor, borderColor: provColor + "30" }}>
                              {(provTotal / 1e6).toFixed(2)} MDH
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        {sortedRubriques.map(([rubrique, d], rIdx) => {
                          const shortRub = SECTEUR_SHORT[rubrique] || rubrique;
                          const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
                          const pct = provTotal > 0 ? (d.cout / provTotal) * 100 : 0;
                          const avgCost = d.count > 0 ? d.cout / d.count : 0;

                          // Group by commune within this rubrique
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
                            <div key={rubrique} className={rIdx > 0 ? "mt-5 pt-5 border-t-2 border-slate-200/60" : ""}>
                              {/* Rubrique header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full shadow-sm shrink-0" style={{ backgroundColor: dotColor }} />
                                  <span className="text-sm font-bold text-slate-800">{shortRub}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2" variant="outline">
                                    {d.count} projets
                                  </Badge>
                                  <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] border" style={{ backgroundColor: dotColor + "12", color: dotColor, borderColor: dotColor + "30" }}>
                                    {(d.cout / 1e6).toFixed(2)} MDH
                                  </span>
                                  <span className="font-bold px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-slate-500 font-medium">Part dans le budget provincial</span>
                                  <span className="text-[10px] font-bold" style={{ color: dotColor }}>{pct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: dotColor }} />
                                </div>
                              </div>

                              {/* Analysis KPIs */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coût moyen / projet</p>
                                  <p className="text-sm font-black text-slate-800">{(avgCost / 1e6).toFixed(2)} <span className="text-[10px] font-semibold text-slate-400">MDH</span></p>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Communes concernées</p>
                                  <p className="text-sm font-black text-slate-800">{sortedCommunes.length}</p>
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 p-3">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Commune dominante</p>
                                  <p className="text-sm font-black" style={{ color: dotColor }}>{topCommune ? topCommune[0] : "—"}</p>
                                  {topCommune && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{(topCommune[1].cout / 1e6).toFixed(2)} MDH ({topCommunePct.toFixed(1)}%)</p>
                                  )}
                                </div>
                              </div>

                              {/* Communes breakdown bars */}
                              <div className="mb-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Répartition par commune</p>
                                <div className="space-y-2">
                                  {sortedCommunes.map(([commune, cData], cIdx) => {
                                    const cPct = (cData.cout / d.cout) * 100;
                                    return (
                                      <div key={commune} className="flex items-center gap-2">
                                        <span className="text-[11px] font-semibold text-slate-700 w-[140px] shrink-0 truncate">{commune}</span>
                                        <div className="flex-1 relative" style={{ height: "16px" }}>
                                          <div className="absolute inset-0 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cPct}%`, backgroundColor: dotColor + (cIdx === 0 ? "" : "99") }} />
                                          </div>
                                          {cPct > 20 ? (
                                            <span className="absolute inset-0 flex items-center pl-2 text-[9px] font-bold text-white pointer-events-none" style={{ maxWidth: `${cPct}%` }}>
                                              {(cData.cout / 1e6).toFixed(2)} MDH
                                            </span>
                                          ) : (
                                            <span className="absolute top-0 flex items-center h-full text-[9px] font-bold pointer-events-none whitespace-nowrap" style={{ left: `calc(${cPct}% + 6px)`, color: dotColor }}>
                                              {(cData.cout / 1e6).toFixed(2)} MDH
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 w-[45px] text-right">{cPct.toFixed(1)}%</span>
                                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[9px] font-bold px-1.5 py-0 shrink-0" variant="outline">
                                          {cData.count}P
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Détail des projets avec consistance */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Détail des projets</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-slate-50/60 border-b border-slate-200">
                                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[18%]">Commune</TableHead>
                                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Projet</TableHead>
                                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[35%]">Consistance</TableHead>
                                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[12%]">Coût (DH)</TableHead>
                                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[10%]">% Rub.</TableHead>
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
                                          className={`border-b border-slate-100 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-indigo-50/30`}
                                        >
                                          <TableCell className="text-[11px] py-2 align-top font-semibold text-slate-700">
                                            {p.commune}
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2 align-top text-slate-700 font-medium">
                                            {p.intitule_projet || <span className="text-slate-300">—</span>}
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2 align-top text-slate-500 leading-relaxed">
                                            {p.consistance || <span className="text-slate-300">—</span>}
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2 align-top text-right">
                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                              {p.cout.toLocaleString("fr-FR")}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-[11px] py-2 align-top text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <div className="w-10 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${projPct}%`, backgroundColor: dotColor }} />
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-500">{projPct.toFixed(1)}%</span>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    {/* Total row */}
                                    <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold border-t-2 border-slate-300">
                                      <TableCell className="text-[11px] font-bold py-2 text-slate-700" colSpan={3}>Total {shortRub}</TableCell>
                                      <TableCell className="text-[11px] text-right font-bold text-emerald-700 py-2">
                                        {(d.cout / 1e6).toFixed(2)} MDH
                                      </TableCell>
                                      <TableCell className="text-[11px] text-right font-bold py-2 text-slate-600">100%</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
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
    <Card
      className={`border-0 shadow-md overflow-hidden bg-gradient-to-br ${bgGradient}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {title}
            </p>
            <p className={`text-2xl font-black mt-1 ${textColor}`}>{value}</p>
          </div>
          <div
            className={`p-2.5 rounded-xl ${iconBg} shadow-sm`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        {/* Decorative gradient bar */}
        <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${gradient} mt-3 opacity-60`} />
      </CardContent>
    </Card>
  );
}
