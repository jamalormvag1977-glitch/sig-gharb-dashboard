"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  KPICards,
  CommuneDetail,
  CommuneList,
} from "@/components/dashboard/KPIAndDetails";
import {
  CostByCommuneChart,
  ProjectsByCommuneChart,
  SecteurPieChart,
  ProvinceBarChart,
} from "@/components/dashboard/Charts";
import { PROVINCE_COLORS } from "@/data/types";
import type { DashboardData, CommuneSummary } from "@/data/types";

import {
  LayoutDashboard,
  Map,
  BarChart3,
  PieChart,
  Filter,
  X,
  Droplets,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent"),
  { ssr: false }
);

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeChart, setActiveChart] = useState<string>("cost");

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

  const handleCommuneClick = useCallback((commune: string) => {
    setSelectedCommune((prev) => (prev === commune ? null : commune));
    setRightSidebarOpen(true);
  }, []);

  const handleProvinceFilter = useCallback((province: string | null) => {
    setSelectedProvince((prev) => (prev === province ? null : province));
    setSelectedCommune(null);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Droplets className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
          <p className="mt-4 text-lg font-medium text-gray-600">
            Chargement du dashboard...
          </p>
        </div>
      </div>
    );
  }

  const totalCommunes = Object.keys(data.summary).length;
  const totalProvinces = Object.keys(data.byProvince).length;
  const communeData = selectedCommune
    ? data.summary[selectedCommune]
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* LEFT SIDEBAR - Filters & Commune List */}
      <div
        className={`transition-all duration-300 border-r border-gray-200 bg-white flex flex-col ${
          leftSidebarOpen ? "w-72" : "w-10"
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 rounded-r-lg p-1 shadow-sm hover:bg-gray-50"
          style={{ marginLeft: leftSidebarOpen ? "288px" : "40px" }}
        >
          {leftSidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {leftSidebarOpen && (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-5 w-5 text-blue-600" />
                <h1 className="text-base font-bold text-gray-800">
                  SIG Gharb
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Projets d&apos;inondations - Région du Gharb
              </p>
            </div>

            {/* Province Filters */}
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                <Filter className="h-3 w-3 inline mr-1" />
                Filtrer par province
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={selectedProvince === null ? "default" : "outline"}
                  onClick={() => handleProvinceFilter(null)}
                  className="text-xs h-7"
                >
                  Toutes
                </Button>
                {Object.keys(PROVINCE_COLORS).map((prov) => (
                  <Button
                    key={prov}
                    size="sm"
                    variant={selectedProvince === prov ? "default" : "outline"}
                    onClick={() => handleProvinceFilter(prov)}
                    className="text-xs h-7"
                    style={
                      selectedProvince === prov
                        ? {
                            backgroundColor: PROVINCE_COLORS[prov],
                            borderColor: PROVINCE_COLORS[prov],
                          }
                        : {}
                    }
                  >
                    {prov}
                  </Button>
                ))}
              </div>
            </div>

            {/* Commune List */}
            <div className="flex-1 overflow-hidden p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Communes ({Object.entries(data.summary).filter(([, d]) => !selectedProvince || d.province === selectedProvince).length})
              </p>
              <CommuneList
                summary={data.summary}
                selectedProvince={selectedProvince}
                selectedCommune={selectedCommune}
                onCommuneSelect={handleCommuneClick}
              />
            </div>
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* KPI Cards */}
        <div className="p-4 pb-2">
          <KPICards
            totalCost={
              selectedProvince
                ? data.byProvince[selectedProvince]?.cout_total ?? data.totalCost
                : data.totalCost
            }
            totalProjects={
              selectedProvince
                ? data.byProvince[selectedProvince]?.nb_projets ?? data.totalProjects
                : data.totalProjects
            }
            totalCommunes={
              selectedProvince
                ? data.byProvince[selectedProvince]?.communes ?? totalCommunes
                : totalCommunes
            }
            totalProvinces={totalProvinces}
            selectedProvince={selectedProvince}
          />
        </div>

        {/* Map + Charts Area */}
        <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4">
          {/* Map */}
          <div className="flex-1 min-w-0">
            <Card className="h-full shadow-sm">
              <CardHeader className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Map className="h-4 w-4 text-blue-500" />
                    Carte Interactive
                  </CardTitle>
                  {selectedCommune && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCommune}
                      <button
                        onClick={() => setSelectedCommune(null)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0" style={{ height: "calc(100% - 40px)" }}>
                <MapComponent
                  geojsonData={geojsonData}
                  selectedCommune={selectedCommune}
                  selectedProvince={selectedProvince}
                  onCommuneClick={handleCommuneClick}
                />
              </CardContent>
            </Card>
          </div>

          {/* Charts Panel (below map or right side) */}
        </div>

        {/* Bottom Charts Row */}
        <div className="px-4 pb-4">
          <Card className="shadow-sm">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Analyse Graphique
                </CardTitle>
                <Tabs value={activeChart} onValueChange={setActiveChart}>
                  <TabsList className="h-7">
                    <TabsTrigger value="cost" className="text-xs px-2 h-5">
                      Coût
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs px-2 h-5">
                      Projets
                    </TabsTrigger>
                    <TabsTrigger value="secteur" className="text-xs px-2 h-5">
                      Secteur
                    </TabsTrigger>
                    <TabsTrigger value="province" className="text-xs px-2 h-5">
                      Province
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {activeChart === "cost" && (
                <CostByCommuneChart
                  summary={data.summary}
                  selectedProvince={selectedProvince}
                  selectedCommune={selectedCommune}
                />
              )}
              {activeChart === "projects" && (
                <ProjectsByCommuneChart
                  summary={data.summary}
                  selectedProvince={selectedProvince}
                  selectedCommune={selectedCommune}
                />
              )}
              {activeChart === "secteur" && (
                <SecteurPieChart
                  summary={data.summary}
                  selectedProvince={selectedProvince}
                  selectedCommune={selectedCommune}
                />
              )}
              {activeChart === "province" && (
                <ProvinceBarChart byProvince={data.byProvince} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Commune Detail */}
      {selectedCommune && communeData && rightSidebarOpen && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <CommuneDetail
            commune={selectedCommune}
            data={communeData}
            onClose={() => {
              setSelectedCommune(null);
              setRightSidebarOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
