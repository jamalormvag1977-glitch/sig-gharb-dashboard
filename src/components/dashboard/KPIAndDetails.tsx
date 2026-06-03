"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Droplets,
  MapPin,
  DollarSign,
  Building2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { CommuneSummary, SECTEUR_COLORS, SECTEUR_SHORT, PROVINCE_COLORS } from "@/data/types";

interface KPIProps {
  totalCost: number;
  totalProjects: number;
  totalCommunes: number;
  totalProvinces: number;
  selectedProvince: string | null;
}

export function KPICards({ totalCost, totalProjects, totalCommunes, totalProvinces, selectedProvince }: KPIProps) {
  const cards = [
    {
      title: "Coût Global",
      value: `${(totalCost / 1e6).toFixed(1)} MDH`,
      icon: DollarSign,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      title: "Projets",
      value: totalProjects.toString(),
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "Communes",
      value: totalCommunes.toString(),
      icon: MapPin,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Provinces",
      value: totalProvinces.toString(),
      icon: Building2,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.title} className={`${card.borderColor} shadow-sm hover:shadow-md transition-shadow`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                  {selectedProvince && card.title !== "Provinces" && ` (${selectedProvince})`}
                </p>
                <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface CommuneDetailProps {
  commune: string;
  data: CommuneSummary;
  onClose: () => void;
}

export function CommuneDetail({ commune, data, onClose }: CommuneDetailProps) {
  return (
    <Card className="shadow-lg border-2" style={{ borderColor: PROVINCE_COLORS[data.province] || "#999" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{commune}</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <Badge
          style={{
            backgroundColor: PROVINCE_COLORS[data.province] || "#999",
            color: "white",
          }}
          className="w-fit text-xs"
        >
          {data.province}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Coût total</p>
            <p className="text-lg font-bold text-red-600">
              {(data.cout_total / 1e6).toFixed(2)} MDH
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Projets</p>
            <p className="text-lg font-bold text-blue-600">{data.nb_projets}</p>
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Répartition par secteur
          </p>
          {Object.entries(data.rubriques)
            .sort(([, a], [, b]) => b - a)
            .map(([rub, cout]) => (
              <div key={rub} className="mb-2">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium" style={{ color: SECTEUR_COLORS[rub] || "#333" }}>
                    {SECTEUR_SHORT[rub] || rub}
                  </span>
                  <span className="font-mono">{(cout / 1e6).toFixed(2)} MDH</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(cout / data.cout_total) * 100}%`,
                      backgroundColor: SECTEUR_COLORS[rub] || "#999",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CommuneListProps {
  summary: Record<string, CommuneSummary>;
  selectedProvince: string | null;
  selectedCommune: string | null;
  onCommuneSelect: (commune: string) => void;
}

export function CommuneList({
  summary,
  selectedProvince,
  selectedCommune,
  onCommuneSelect,
}: CommuneListProps) {
  const filteredCommunes = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .sort(([, a], [, b]) => b.cout_total - a.cout_total);

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-1.5 pr-2">
        {filteredCommunes.map(([name, data]) => (
          <button
            key={name}
            onClick={() => onCommuneSelect(name)}
            className={`w-full text-left p-2.5 rounded-lg transition-all hover:shadow-sm border ${
              selectedCommune === name
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-transparent hover:border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground">{data.province}</p>
              </div>
              <div className="text-right ml-2 shrink-0">
                <p className="text-sm font-bold text-red-600">
                  {(data.cout_total / 1e6).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.nb_projets}P
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
