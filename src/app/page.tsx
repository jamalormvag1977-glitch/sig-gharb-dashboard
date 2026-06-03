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
  SecteurPieChart,
  ProvinceBarChart,
} from "@/components/dashboard/Charts";
import { PROVINCE_COLORS, SECTEUR_SHORT } from "@/data/types";
import type { DashboardData, CommuneSummary, Project } from "@/data/types";

import {
  LayoutDashboard,
  Map,
  BarChart3,
  Droplets,
  MapPin,
  Building2,
  DollarSign,
  TableIcon,
  PieChart,
  ChevronRight,
  FileText,
} from "lucide-react";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent"),
  { ssr: false }
);

type ViewType = "overview" | "kenitra" | "sidi-kacem" | "sidi-slimane";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "kenitra", label: "Province Kénitra", icon: Building2 },
  { id: "sidi-kacem", label: "Province Sidi Kacem", icon: Building2 },
  { id: "sidi-slimane", label: "Province Sidi Slimane", icon: Building2 },
];

const PROVINCE_MAP: Record<ViewType, string | null> = {
  overview: null,
  kenitra: "Kénitra",
  "sidi-kacem": "Sidi Kacem",
  "sidi-slimane": "Sidi Slimane",
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("overview");

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
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <Droplets className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
          <p className="mt-4 text-lg font-medium text-gray-600">
            Chargement du dashboard...
          </p>
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* DARK SIDEBAR ON THE LEFT */}
      <aside className="w-72 bg-[#0f0f1a] text-white flex flex-col shrink-0 border-r border-white/10">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">SIG Gharb</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Projets Inondations 2026</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Province Stats */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Résumé par province</p>
          {Object.entries(PROVINCE_COLORS).map(([name, color]) => {
            const provData = data.byProvince[name];
            const isActive = selectedProvince === name;
            return (
              <div
                key={name}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
                onClick={() => {
                  const viewId = name === "Kénitra" ? "kenitra" : name === "Sidi Kacem" ? "sidi-kacem" : "sidi-slimane";
                  setActiveView(viewId);
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-gray-200">{name}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <span className="text-gray-500">Coût: </span>
                    <span className="text-emerald-400 font-bold">{((provData?.cout_total ?? 0) / 1e6).toFixed(1)} MDH</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Projets: </span>
                    <span className="text-white font-bold">{provData?.nb_projets ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Communes: </span>
                    <span className="text-white font-bold">{provData?.communes ?? 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom total */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-emerald-600/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Total Gharb</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{(totalCost / 1e6).toFixed(1)} MDH</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{totalProjects} projets / {totalCommunes} communes</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT - Right side */}
      <main className="flex-1 overflow-y-auto">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {activeView === "overview"
                  ? "ORMVAG - Tableau de bord"
                  : `Province de ${selectedProvince}`}
              </h2>
              <p className="text-sm text-gray-500">
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
                      style={{ backgroundColor: color, color: "white" }}
                      className="text-xs px-3 py-1"
                    >
                      {name}: {(provData?.cout_total ?? 0) / 1e6} MDH
                    </Badge>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Coût Global"
              value={`${(totalCost / 1e6).toFixed(1)} MDH`}
              icon={DollarSign}
              color="emerald"
            />
            <KPICard
              title="Projets"
              value={totalProjects.toString()}
              icon={BarChart3}
              color="blue"
            />
            <KPICard
              title="Communes"
              value={totalCommunes.toString()}
              icon={MapPin}
              color="amber"
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
              icon={PieChart}
              color="rose"
            />
          </div>

          {/* MAP + PIE side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="h-[480px] !py-0 !gap-0 overflow-hidden">
                <CardHeader className="py-2 px-4 border-b bg-gray-50 shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Map className="h-4 w-4 text-blue-500" />
                    {activeView === "overview"
                      ? "Carte - Région du Gharb"
                      : `Carte - Province ${selectedProvince}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0" style={{ height: "calc(100% - 40px)" }}>
                  <MapComponent
                    geojsonData={geojsonData}
                    selectedCommune={null}
                    selectedProvince={selectedProvince}
                    onCommuneClick={() => {}}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Pie Chart */}
            <Card className="h-[480px] !py-0 !gap-0 overflow-hidden">
              <CardHeader className="py-2 px-4 border-b bg-gray-50 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-rose-500" />
                  Répartition par secteur
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 min-h-0 overflow-hidden">
                <SecteurPieChart
                  summary={filteredSummary}
                  selectedProvince={selectedProvince}
                  selectedCommune={null}
                />
              </CardContent>
            </Card>
          </div>

          {/* TABLE + BAR CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Summary Table */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 border-b bg-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-amber-500" />
                  Résumé par commune
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Commune</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Projets</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Coût (MDH)</TableHead>
                        <TableHead className="text-xs font-semibold">Secteur principal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(filteredSummary)
                        .sort(([, a], [, b]) => b.cout_total - a.cout_total)
                        .map(([name, d]) => {
                          const topSecteur =
                            Object.entries(d.rubriques).sort(
                              ([, a], [, b]) => b - a
                            )[0]?.[0] || "";
                          return (
                            <TableRow key={name} className="hover:bg-gray-50">
                              <TableCell className="text-xs font-medium py-2">
                                {name}
                              </TableCell>
                              <TableCell className="text-xs text-right py-2">
                                <Badge variant="secondary" className="text-xs">
                                  {d.nb_projets}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold text-red-600 py-2">
                                {(d.cout_total / 1e6).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs py-2">
                                <span
                                  className="inline-block w-2 h-2 rounded-full mr-1"
                                  style={{
                                    backgroundColor:
                                      SECTEUR_SHORT[topSecteur]
                                        ? {
                                            "Assainissement & Drainage": "#e74c3c",
                                            "Pistes agricoles": "#3498db",
                                            "Stations de pompage": "#f39c12",
                                            "Réhabilitation équipements": "#2ecc71",
                                            "Génie civil": "#9b59b6",
                                          }[
                                            SECTEUR_SHORT[topSecteur] as string
                                          ] || "#999"
                                        : "#999",
                                  }}
                                />
                                {SECTEUR_SHORT[topSecteur] || topSecteur.substring(0, 20)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 border-b bg-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 border-b bg-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Comparaison par province
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ProvinceBarChart byProvince={data.byProvince} />
              </CardContent>
            </Card>
          )}

          {/* DETAILED PROJECT TABLE BY COMMUNE */}
          <Card className="overflow-hidden">
            <CardHeader className="py-2 px-4 border-b bg-gray-50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Détail des projets par commune
                {selectedProvince && ` - Province ${selectedProvince}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {Object.entries(projectsByCommune)
                  .sort(([, a], [, b]) => {
                    const totalA = a.reduce((s, p) => s + p.cout, 0);
                    const totalB = b.reduce((s, p) => s + p.cout, 0);
                    return totalB - totalA;
                  })
                  .map(([commune, projects]) => {
                    const communeTotal = projects.reduce((s, p) => s + p.cout, 0);
                    const communeData = filteredSummary[commune];
                    return (
                      <div key={commune}>
                        {/* Commune header */}
                        <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between border-b border-gray-200 sticky top-0 z-10">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: communeData
                                  ? PROVINCE_COLORS[communeData.province] || "#999"
                                  : "#999",
                              }}
                            />
                            <span className="text-sm font-bold text-gray-800">{commune}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {communeData?.province}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-500">{projects.length} projets</span>
                            <span className="font-bold text-red-600">
                              {(communeTotal / 1e6).toFixed(2)} MDH
                            </span>
                          </div>
                        </div>
                        {/* Projects rows */}
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/80">
                              <TableHead className="text-[11px] font-semibold text-gray-600 w-[25%]">Intitulé Rubrique</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-600 w-[30%]">Projet</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-600 w-[30%]">Consistance</TableHead>
                              <TableHead className="text-[11px] font-semibold text-gray-600 text-right w-[15%]">Coût (DH)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {projects.map((p, i) => (
                              <TableRow key={i} className="hover:bg-blue-50/30">
                                <TableCell className="text-[11px] py-2 align-top">
                                  <span
                                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mt-1"
                                    style={{
                                      backgroundColor: SECTEUR_SHORT[p.intitule_rubrique]
                                        ? {
                                            "Assainissement & Drainage": "#e74c3c",
                                            "Pistes agricoles": "#3498db",
                                            "Stations de pompage": "#f39c12",
                                            "Réhabilitation équipements": "#2ecc71",
                                            "Génie civil": "#9b59b6",
                                          }[
                                            SECTEUR_SHORT[p.intitule_rubrique] as string
                                          ] || "#999"
                                        : "#999",
                                    }}
                                  />
                                  {SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique}
                                </TableCell>
                                <TableCell className="text-[11px] py-2 align-top text-gray-700">
                                  {p.intitule_projet || "—"}
                                </TableCell>
                                <TableCell className="text-[11px] py-2 align-top text-gray-600">
                                  {p.consistance || "—"}
                                </TableCell>
                                <TableCell className="text-[11px] py-2 align-top text-right font-bold text-red-600">
                                  {p.cout.toLocaleString("fr-FR")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: "emerald" | "blue" | "amber" | "rose";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const iconColors = {
    emerald: "text-emerald-600 bg-emerald-100",
    blue: "text-blue-600 bg-blue-100",
    amber: "text-amber-600 bg-amber-100",
    rose: "text-rose-600 bg-rose-100",
  };

  return (
    <Card className={`border ${colors[color]} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className={`text-2xl font-bold mt-1 ${colors[color].split(" ")[1]}`}>
              {value}
            </p>
          </div>
          <div className={`p-2 rounded-lg ${iconColors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
