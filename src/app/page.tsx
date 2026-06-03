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

          {/* MAP - full width (no pie chart) */}
          <Card className="h-[700px] !py-0 !gap-0 overflow-hidden shadow-md border-slate-200/60">
            <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-slate-50 to-white shrink-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
                <Map className="h-4 w-4 text-blue-500" />
                {activeView === "overview"
                  ? "Carte - Région du Gharb"
                  : `Carte - Province ${selectedProvince}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0" style={{ height: "calc(100% - 44px)" }}>
              <MapComponent
                geojsonData={geojsonData}
                selectedCommune={null}
                selectedProvince={selectedProvince}
                onCommuneClick={() => {}}
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
                      <TableHead className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Secteur principal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(filteredSummary)
                      .sort(([, a], [, b]) => b.cout_total - a.cout_total)
                      .map(([name, d], idx) => {
                        const topSecteur =
                          Object.entries(d.rubriques).sort(
                            ([, a], [, b]) => b - a
                          )[0]?.[0] || "";
                        const shortSecteur = SECTEUR_SHORT[topSecteur] || topSecteur.substring(0, 20);
                        return (
                          <TableRow
                            key={name}
                            className={`border-b border-slate-100 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            } hover:bg-blue-50/50`}
                          >
                            <TableCell className="text-xs font-semibold py-2.5 text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: PROVINCE_COLORS[d.province] || "#999" }}
                                />
                                {name}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right py-2.5">
                              <Badge
                                className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-1.5"
                                variant="outline"
                              >
                                {d.nb_projets}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right py-2.5 font-bold text-emerald-600">
                              {(d.cout_total / 1e6).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    (SECTEUR_DOT_COLORS[shortSecteur] || "#999") + "15",
                                  color: SECTEUR_DOT_COLORS[shortSecteur] || "#999",
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: SECTEUR_DOT_COLORS[shortSecteur] || "#999",
                                  }}
                                />
                                {shortSecteur}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                            <Badge
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2"
                              variant="outline"
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {projects.length} projets
                            </Badge>
                            <span
                              className="font-bold px-2.5 py-1 rounded-lg text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              {(communeTotal / 1e6).toFixed(2)} MDH
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/60 border-b border-slate-200">
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[22%]">
                                Rubrique
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[28%]">
                                Projet
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[30%]">
                                Consistance
                              </TableHead>
                              <TableHead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[12%]">
                                Coût (DH)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projects.map((p, i) => {
                              const shortRub = SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique;
                              const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
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
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
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
