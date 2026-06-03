"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ProjectsByCommuneChart,
  SecteurPieChart,
  ProvinceBarChart,
} from "@/components/dashboard/Charts";
import { PROVINCE_COLORS, SECTEUR_SHORT } from "@/data/types";
import type { DashboardData, CommuneSummary } from "@/data/types";

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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* DARK SIDEBAR */}
      <aside className="w-64 bg-[#1a1a2e] text-white flex flex-col shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">SIG Gharb</h1>
              <p className="text-xs text-gray-400">Projets Inondations</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Stats */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Coût total</span>
            <span className="text-emerald-400 font-bold">{(totalCost / 1e6).toFixed(1)} MDH</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Projets</span>
            <span className="text-white font-bold">{totalProjects}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Communes</span>
            <span className="text-white font-bold">{totalCommunes}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
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

        <div className="p-6 space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="h-[450px] !py-0 !gap-0 overflow-hidden">
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
            <Card className="h-[450px] !py-0 !gap-0 overflow-hidden">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 border-b bg-gray-50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-amber-500" />
                  Détail par commune
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
