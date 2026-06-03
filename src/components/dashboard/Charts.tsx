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

export function CostByCommuneChart({ summary, selectedProvince }: ChartsProps) {
  const data = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .map(([name, d]) => ({
      name: name.length > 12 ? name.substring(0, 12) + "…" : name,
      fullName: name,
      cout: d.cout_total,
      province: d.province,
    }))
    .sort((a, b) => b.cout - a.cout);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          type="number"
          tickFormatter={formatCost}
          fontSize={11}
          tick={{ fill: "#666" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          fontSize={10}
          tick={{ fill: "#333" }}
        />
        <Tooltip
          formatter={(value: number) => [formatCost(value), "Coût global"]}
          labelFormatter={(label) => {
            const item = data.find((d) => d.name === label);
            return item?.fullName || label;
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
        <Bar dataKey="cout" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={PROVINCE_COLORS[entry.province] || "#999"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProjectsByCommuneChart({ summary, selectedProvince }: ChartsProps) {
  const data = Object.entries(summary)
    .filter(([, d]) => !selectedProvince || d.province === selectedProvince)
    .map(([name, d]) => ({
      name: name.length > 12 ? name.substring(0, 12) + "…" : name,
      fullName: name,
      projets: d.nb_projets,
      province: d.province,
    }))
    .sort((a, b) => b.projets - a.projets);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
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
            const item = data.find((d) => d.name === label);
            return item?.fullName || label;
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
        <Bar dataKey="projets" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={PROVINCE_COLORS[entry.province] || "#999"}
              fillOpacity={0.8}
            />
          ))}
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
  const data = Object.entries(byProvince).map(([name, d]) => ({
    name,
    cout: d.cout_total,
    projets: d.nb_projets,
    communes: d.communes,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
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
        <Bar yAxisId="left" dataKey="cout" fill="#e74c3c" radius={[4, 4, 0, 0]} maxBarSize={40} name="Coût" />
        <Bar yAxisId="right" dataKey="projets" fill="#3498db" radius={[4, 4, 0, 0]} maxBarSize={40} name="Projets" />
      </BarChart>
    </ResponsiveContainer>
  );
}
