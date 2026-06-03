"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { CommuneSummary, SECTEUR_COLORS, SECTEUR_SHORT, PROVINCE_COLORS } from "@/data/types";

interface ChartsProps {
  summary: Record<string, CommuneSummary>;
  selectedProvince: string | null;
  selectedCommune: string | null;
}

const formatCost = (value: number) => {
  return `${(value / 1e6).toFixed(1)} MDH`;
};

// Distinct colors for each commune - vibrant and distinguishable (30 colors)
const COMMUNE_PALETTE = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#0ea5e9", "#d946ef",
  "#22c55e", "#eab308", "#64748b", "#fb923c", "#2dd4bf",
  "#7c3aed", "#059669", "#dc2626", "#0891b2", "#d97706",
  "#4f46e5", "#be185d", "#15803d", "#9333ea", "#0d9488",
];

export function CostByCommuneChart({ summary, selectedProvince }: ChartsProps) {
  const totalCost = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .reduce((sum, [, d]) => sum + d.cout_total, 0);

  const data = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .map(([name, d], idx) => ({
      name: name.length > 14 ? name.substring(0, 14) + "…" : name,
      fullName: name,
      cout: d.cout_total,
      province: d.province,
      color: COMMUNE_PALETTE[idx % COMMUNE_PALETTE.length],
      pct: totalCost > 0 ? (d.cout_total / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cout - a.cout);

  // Re-assign colors after sort to maintain distinct colors
  const coloredData = data.map((d, idx) => ({ ...d, color: COMMUNE_PALETTE[idx % COMMUNE_PALETTE.length] }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={coloredData}
        layout="vertical"
        margin={{ left: 10, right: 70, top: 5, bottom: 5 }}
        barCategoryGap={8}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatCost}
          fontSize={10}
          tick={{ fill: "#94a3b8" }}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={105}
          fontSize={10}
          tick={{ fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [formatCost(value), "Coût global"]}
          labelFormatter={(label) => {
            const item = coloredData.find((d) => d.name === label);
            return item?.fullName || label;
          }}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="cout" radius={[0, 6, 6, 0]} maxBarSize={28}>
          {coloredData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              fillOpacity={0.85}
            />
          ))}
          <LabelList
            dataKey="cout"
            position="right"
            formatter={(value: number, _props: any, idx: number) => {
              const item = coloredData[idx];
              if (!item) return `${(value / 1e6).toFixed(1)}`;
              const mdh = (value / 1e6).toFixed(1);
              const pct = item.pct.toFixed(1);
              return `${mdh} (${pct}%)`;
            }}
            style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectsByCommuneChart({ summary, selectedProvince }: ChartsProps) {
  const data = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .map(([name, d], idx) => ({
      name: name.length > 12 ? name.substring(0, 12) + "…" : name,
      fullName: name,
      projets: d.nb_projets,
      province: d.province,
      color: COMMUNE_PALETTE[idx % COMMUNE_PALETTE.length],
    }))
    .sort((a, b) => b.projets - a.projets);

  const coloredData = data.map((d, idx) => ({ ...d, color: COMMUNE_PALETTE[idx % COMMUNE_PALETTE.length] }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={coloredData} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" fontSize={11} tick={{ fill: "#666" }} />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          fontSize={10}
          tick={{ fill: "#333" }}
        />
        <Tooltip
          formatter={(value: number) => [value, "Nombre de projets"]}
          labelFormatter={(label) => {
            const item = coloredData.find((d) => d.name === label);
            return item?.fullName || label;
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
        <Bar dataKey="projets" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {coloredData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              fillOpacity={0.85}
            />
          ))}
          <LabelList
            dataKey="projets"
            position="right"
            style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SecteurPieChart({ summary, selectedProvince }: ChartsProps) {
  const secteurTotals: Record<string, number> = {};
  Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .forEach(([, d]) => {
      Object.entries(d.rubriques).forEach(([rub, cout]) => {
        secteurTotals[rub] = (secteurTotals[rub] || 0) + cout;
      });
    });

  const data = Object.entries(secteurTotals)
    .map(([name, value]) => ({
      name: SECTEUR_SHORT[name] || name,
      fullName: name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const colors = data.map((d) => SECTEUR_COLORS[d.fullName] || "#999");

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          labelLine={true}
          fontSize={10}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatCost(value), "Coût"]}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProvinceBarChart({
  byProvince,
}: {
  byProvince: Record<string, { nb_projets: number; cout_total: number; communes: number }>;
}) {
  const totalCost = Object.values(byProvince).reduce((s, d) => s + d.cout_total, 0);
  const PROVINCE_BAR_COLORS = ["#3b82f6", "#ef4444", "#10b981"];

  const data = Object.entries(byProvince).map(([name, d], idx) => ({
    name,
    cout: d.cout_total,
    projets: d.nb_projets,
    communes: d.communes,
    barColor: PROVINCE_BAR_COLORS[idx % PROVINCE_BAR_COLORS.length],
    pct: totalCost > 0 ? (d.cout_total / totalCost) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 10, right: 30, top: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" fontSize={11} tick={{ fill: "#333" }} />
        <YAxis
          yAxisId="left"
          tickFormatter={formatCost}
          fontSize={11}
          tick={{ fill: "#666" }}
        />
        <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: "#666" }} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          formatter={(value: number, name: string) => {
            if (name === "cout") return [formatCost(value), "Coût global"];
            return [value, "Projets"];
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="cout" radius={[4, 4, 0, 0]} maxBarSize={40} name="Coût">
          {data.map((entry, index) => (
            <Cell key={`cout-${index}`} fill={entry.barColor} fillOpacity={0.8} />
          ))}
          <LabelList
            dataKey="cout"
            position="top"
            formatter={(value: number, _props: any, idx: number) => {
              const item = data[idx];
              if (!item) return formatCost(value);
              return `${formatCost(value)} (${item.pct.toFixed(1)}%)`;
            }}
            style={{ fontSize: 9, fontWeight: 700, fill: "#475569" }}
          />
        </Bar>
        <Bar yAxisId="right" dataKey="projets" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} name="Projets">
          {data.map((_, index) => (
            <Cell key={`proj-${index}`} fill="#8b5cf6" fillOpacity={0.7} />
          ))}
          <LabelList
            dataKey="projets"
            position="top"
            style={{ fontSize: 10, fontWeight: 700, fill: "#6d28d9" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
