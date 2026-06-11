"use client";

import { useState, useRef, useCallback } from "react";
import type { DashboardData, CommuneSummary, Project } from "@/data/types";
import { PROVINCE_COLORS } from "@/data/types";
import {
  MapPin,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  CircleDot,
  ChevronRight,
} from "lucide-react";

interface InteractiveOrmvagMapProps {
  data: DashboardData;
  onProvinceClick?: (province: string) => void;
  compact?: boolean;
}

// Province hotspot positions as percentages of image dimensions
// These map to approximate locations on the ORMVAG card image
const PROVINCE_ZONES: Record<string, {
  // Polygon points as % of image width/height
  path: string;
  // Label position
  labelX: number;
  labelY: number;
  // Color
  color: string;
}> = {
  "Kénitra": {
    path: "M 5,15 L 42,8 L 48,22 L 50,42 L 45,55 L 30,62 L 12,58 L 3,42 Z",
    labelX: 26,
    labelY: 38,
    color: "#d4a017",
  },
  "Sidi Kacem": {
    path: "M 48,8 L 95,10 L 97,35 L 92,55 L 78,62 L 60,58 L 50,42 L 48,22 Z",
    labelX: 73,
    labelY: 36,
    color: "#c76e7e",
  },
  "Sidi Slimane": {
    path: "M 30,62 L 60,58 L 78,62 L 82,78 L 75,92 L 55,95 L 35,92 L 22,78 Z",
    labelX: 52,
    labelY: 77,
    color: "#5bb58a",
  },
};

// Commune approximate positions per province (as % of image dimensions)
// These are approximate locations based on the ORMVAG map geography
const COMMUNE_POSITIONS: Record<string, { x: number; y: number; province: string }[]> = {
  "Kénitra": [
    { x: 14, y: 28, province: "Kénitra" },   // Kénitra (ville)
    { x: 20, y: 22, province: "Kénitra" },   // Ameur
    { x: 28, y: 32, province: "Kénitra" },   // Sidi Taibi
    { x: 32, y: 44, province: "Kénitra" },   // Moulay Bousselham
    { x: 18, y: 48, province: "Kénitra" },   // Soualem
    { x: 25, y: 52, province: "Kénitra" },   // Lalla Mimouna
    { x: 38, y: 40, province: "Kénitra" },   // Sidi Slimane (Kénitra part)
    { x: 10, y: 40, province: "Kénitra" },   // Ben Arébia
    { x: 22, y: 38, province: "Kénitra" },   // Oulad Oujih
    { x: 35, y: 52, province: "Kénitra" },   // Sidi Mohamed Ben Aissa
  ],
  "Sidi Kacem": [
    { x: 60, y: 22, province: "Sidi Kacem" },  // Sidi Kacem (ville)
    { x: 72, y: 28, province: "Sidi Kacem" },  // Ouezzane
    { x: 82, y: 32, province: "Sidi Kacem" },  // Zoumi
    { x: 68, y: 38, province: "Sidi Kacem" },  // Bni Zeroual
    { x: 85, y: 22, province: "Sidi Kacem" },  // Mokrisset
    { x: 78, y: 44, province: "Sidi Kacem" },  // Tabouda
    { x: 90, y: 42, province: "Sidi Kacem" },  // Dhar Souk
    { x: 65, y: 48, province: "Sidi Kacem" },  // Zerhoun
    { x: 56, y: 35, province: "Sidi Kacem" },  // Oulad M'Gar
    { x: 75, y: 50, province: "Sidi Kacem" },  // Kremim
  ],
  "Sidi Slimane": [
    { x: 42, y: 68, province: "Sidi Slimane" },  // Sidi Slimane (ville)
    { x: 55, y: 72, province: "Sidi Slimane" },  // Sidi Yahya
    { x: 48, y: 80, province: "Sidi Slimane" },  // Arbaoua
    { x: 60, y: 82, province: "Sidi Slimane" },  // Khnichet
    { x: 38, y: 78, province: "Sidi Slimane" },  // Akracha
    { x: 52, y: 88, province: "Sidi Slimane" },  // El Atef
    { x: 65, y: 75, province: "Sidi Slimane" },  // Ben Mansour
    { x: 44, y: 90, province: "Sidi Slimane" },  // Dar Bel Amri
  ],
};

const STATUS_COLORS: Record<string, string> = {
  "Terminé": "#10b981",
  "En cours": "#f59e0b",
  "Non démarré": "#ef4444",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  "Terminé": CheckCircle2,
  "En cours": Clock,
  "Non démarré": CircleDot,
};

export default function InteractiveOrmvagMap({
  data,
  onProvinceClick,
  compact = false,
}: InteractiveOrmvagMapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredCommune, setHoveredCommune] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleProvinceClick = useCallback(
    (province: string) => {
      if (selectedProvince === province) {
        setSelectedProvince(null);
      } else {
        setSelectedProvince(province);
      }
      onProvinceClick?.(province);
    },
    [selectedProvince, onProvinceClick]
  );

  // Build commune data with project info
  const communeProjectData = (() => {
    const result: Record<
      string,
      {
        x: number;
        y: number;
        province: string;
        nbProjets: number;
        coutTotal: number;
        statusCounts: Record<string, number>;
        projects: Project[];
      }
    > = {};

    Object.entries(COMMUNE_POSITIONS).forEach(([province, positions]) => {
      positions.forEach((pos, idx) => {
        // Find matching commune data from summary
        const provinceCommunes = Object.entries(data.summary)
          .filter(([, d]) => d.province === province)
          .sort(([, a], [, b]) => b.cout_total - a.cout_total);

        const communeEntry = provinceCommunes[idx];
        const communeName = communeEntry ? communeEntry[0] : null;
        const communeData = communeEntry ? communeEntry[1] : null;
        const projects = communeName
          ? data.projects.filter((p) => p.commune === communeName)
          : [];

        const statusCounts: Record<string, number> = { "Terminé": 0, "En cours": 0, "Non démarré": 0 };
        projects.forEach((p) => {
          if (statusCounts[p.statut] !== undefined) statusCounts[p.statut]++;
        });

        const key = `${province}-${idx}`;
        result[key] = {
          x: pos.x,
          y: pos.y,
          province: pos.province,
          nbProjets: communeData?.nb_projets ?? projects.length,
          coutTotal: communeData?.cout_total ?? 0,
          statusCounts,
          projects,
          ...(communeName ? { name: communeName } : {}),
        };
      });
    });

    return result;
  })();

  // Get province stats
  const getProvinceStats = (province: string) => {
    const provData = data.byProvince[province];
    if (!provData) return null;
    const projects = data.projects.filter((p) => p.province === province);
    const statusCounts: Record<string, number> = { "Terminé": 0, "En cours": 0, "Non démarré": 0 };
    projects.forEach((p) => {
      if (statusCounts[p.statut] !== undefined) statusCounts[p.statut]++;
    });
    const avgPhys = projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.avancement_physique, 0) / projects.length)
      : 0;
    const avgFin = projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.avancement_financier, 0) / projects.length)
      : 0;
    return { ...provData, statusCounts, avgPhys, avgFin, projects };
  };

  const activeProvince = hoveredProvince || selectedProvince;
  const activeStats = activeProvince ? getProvinceStats(activeProvince) : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full group"
      style={{ minHeight: compact ? 280 : 400 }}
    >
      {/* ORMVAG Map Image */}
      <img
        ref={imageRef}
        src="/carte_ormvag.jpeg"
        alt="Carte ORMVAG interactive - Secteurs équipés du Gharb"
        className="w-full h-auto object-contain bg-slate-100"
        style={{ maxHeight: compact ? "300px" : "480px" }}
        draggable={false}
      />

      {/* SVG Overlay for interactive hotspots */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ pointerEvents: "none" }}
      >
        {/* Province zone overlays */}
        {Object.entries(PROVINCE_ZONES).map(([name, zone]) => {
          const isActive = activeProvince === name;
          const isOtherActive = activeProvince && activeProvince !== name;
          const opacity = isOtherActive ? 0.15 : isActive ? 0.35 : 0.18;

          return (
            <g key={name} style={{ pointerEvents: "all" }}>
              {/* Clickable zone with fill */}
              <path
                d={zone.path}
                fill={zone.color}
                fillOpacity={opacity}
                stroke={zone.color}
                strokeWidth={isActive ? 0.8 : 0.4}
                strokeOpacity={isActive ? 1 : 0.6}
                style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                onMouseEnter={() => setHoveredProvince(name)}
                onMouseLeave={() => setHoveredProvince(null)}
                onClick={() => handleProvinceClick(name)}
              />
              {/* Animated pulse for active province */}
              {isActive && (
                <path
                  d={zone.path}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={0.3}
                  strokeOpacity={0.5}
                  strokeDasharray="2 1"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </path>
              )}
            </g>
          );
        })}

        {/* Commune dots */}
        {Object.entries(communeProjectData).map(([key, commune]) => {
          const isProvinceActive = activeProvince === commune.province;
          const noProvinceActive = !activeProvince;
          const showDot = isProvinceActive || noProvinceActive;
          if (!showDot) return null;

          const dotSize = Math.max(0.8, Math.min(2.5, Math.sqrt(commune.nbProjets) * 0.7));
          const dominantStatus = Object.entries(commune.statusCounts).sort(
            ([, a], [, b]) => b - a
          )[0][0];
          const statusColor = STATUS_COLORS[dominantStatus] || "#94a3b8";
          const provinceColor = PROVINCE_COLORS[commune.province] || "#6366f1";

          return (
            <g key={key} style={{ pointerEvents: "all" }}>
              {/* Glow ring for communes with projects */}
              {commune.nbProjets > 0 && isProvinceActive && (
                <circle
                  cx={commune.x}
                  cy={commune.y}
                  r={dotSize + 0.8}
                  fill="none"
                  stroke={provinceColor}
                  strokeWidth={0.15}
                  strokeOpacity={0.4}
                  style={{ pointerEvents: "none" }}
                >
                  <animate
                    attributeName="r"
                    values={`${dotSize + 0.5};${dotSize + 1.2};${dotSize + 0.5}`}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.4;0.1;0.4"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Province-colored outer ring */}
              <circle
                cx={commune.x}
                cy={commune.y}
                r={dotSize + 0.3}
                fill="none"
                stroke={provinceColor}
                strokeWidth={0.25}
                strokeOpacity={isProvinceActive ? 0.9 : 0.4}
                style={{ pointerEvents: "none" }}
              />
              {/* Status-colored inner dot */}
              <circle
                cx={commune.x}
                cy={commune.y}
                r={dotSize}
                fill={commune.nbProjets > 0 ? statusColor : "#94a3b8"}
                fillOpacity={isProvinceActive ? 0.9 : 0.5}
                stroke="#fff"
                strokeWidth={0.2}
                strokeOpacity={0.8}
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={(e) => {
                  setHoveredCommune(key);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: (commune.x / 100) * rect.width,
                      y: (commune.y / 100) * rect.height,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredCommune(null);
                  setTooltipPos(null);
                }}
              />
              {/* Project count badge */}
              {commune.nbProjets > 0 && isProvinceActive && (
                <text
                  x={commune.x}
                  y={commune.y + 0.3}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="1"
                  fontWeight="bold"
                  style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.5)" }}
                >
                  {commune.nbProjets}
                </text>
              )}
            </g>
          );
        })}

        {/* Province labels */}
        {Object.entries(PROVINCE_ZONES).map(([name, zone]) => {
          const isActive = activeProvince === name;
          const isOtherActive = activeProvince && activeProvince !== name;
          if (isOtherActive) return null;

          return (
            <g key={`label-${name}`} style={{ pointerEvents: "none" }}>
              {/* Province name label */}
              <text
                x={zone.labelX}
                y={zone.labelY - 1.5}
                textAnchor="middle"
                fill="#fff"
                fontSize="2.2"
                fontWeight="bold"
                style={{
                  textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 12px rgba(0,0,0,0.4)",
                  opacity: isActive ? 1 : 0.85,
                  transition: "opacity 0.3s ease",
                }}
              >
                {name}
              </text>
              {/* Budget label */}
              <text
                x={zone.labelX}
                y={zone.labelY + 1.2}
                textAnchor="middle"
                fill="#ffe066"
                fontSize="1.5"
                fontWeight="bold"
                style={{
                  textShadow: "0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.4)",
                  opacity: isActive ? 1 : 0.75,
                  transition: "opacity 0.3s ease",
                }}
              >
                {((data.byProvince[name]?.cout_total ?? 0) / 1e6).toFixed(1)} MDH
              </text>
              {/* Project count label */}
              <text
                x={zone.labelX}
                y={zone.labelY + 3.2}
                textAnchor="middle"
                fill="#ddd"
                fontSize="1.3"
                fontWeight="600"
                style={{
                  textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                  opacity: isActive ? 1 : 0.65,
                  transition: "opacity 0.3s ease",
                }}
              >
                {data.byProvince[name]?.nb_projets ?? 0} projets
              </text>
            </g>
          );
        })}
      </svg>

      {/* Commune Tooltip on hover */}
      {hoveredCommune && communeProjectData[hoveredCommune] && tooltipPos && (
        <div
          className="absolute z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/60 p-3 pointer-events-none"
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y - 20}px`,
            minWidth: 200,
            maxWidth: 280,
          }}
        >
          {(() => {
            const c = communeProjectData[hoveredCommune];
            const cName = (c as any).name || `Commune ${hoveredCommune.split("-")[1]}`;
            const provinceColor = PROVINCE_COLORS[c.province] || "#6366f1";
            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: provinceColor }}
                  />
                  <span className="text-sm font-bold text-slate-800 truncate">{cName}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mb-2">{c.province}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Projets</p>
                    <p className="text-sm font-black text-slate-800">{c.nbProjets}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Budget</p>
                    <p className="text-sm font-black" style={{ color: provinceColor }}>
                      {(c.coutTotal / 1e6).toFixed(1)}M
                    </p>
                  </div>
                </div>
                {Object.entries(c.statusCounts).some(([, v]) => v > 0) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {Object.entries(c.statusCounts)
                      .filter(([, v]) => v > 0)
                      .map(([status, count]) => (
                        <span
                          key={status}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: STATUS_COLORS[status] }}
                        >
                          {count} {status}
                        </span>
                      ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Province Detail Panel (shows when a province is selected) */}
      {activeProvince && activeStats && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent p-4 pt-12 transition-all duration-300"
          style={{ pointerEvents: activeProvince ? "all" : "none" }}
        >
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ backgroundColor: PROVINCE_COLORS[activeProvince] }}
                />
                <span className="text-[10px] font-bold text-green-300 uppercase tracking-widest">
                  Province de {activeProvince}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-extrabold text-white drop-shadow-lg">
                  {((activeStats.cout_total ?? 0) / 1e6).toFixed(1)} MDH
                </h3>
                <span className="text-sm text-slate-300">
                  {activeStats.nb_projets} projets · {activeStats.communes} communes
                </span>
              </div>
              {/* Progress bars */}
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-blue-300">Phys.</span>
                  <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${activeStats.avgPhys}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-300">{activeStats.avgPhys}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-purple-300">Fin.</span>
                  <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all duration-700"
                      style={{ width: `${activeStats.avgFin}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-purple-300">{activeStats.avgFin}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(activeStats.statusCounts).map(([status, count]) => {
                if (count === 0) return null;
                return (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                    <span className="text-[10px] font-bold text-white">{count}</span>
                    <span className="text-[9px] text-slate-300">{status}</span>
                  </div>
                );
              })}
              <button
                onClick={() => handleProvinceClick(activeProvince)}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 transition-colors ml-2"
              >
                <span className="text-[10px] font-bold text-white">Voir détail</span>
                <ChevronRight className="h-3 w-3 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-left badge */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-slate-200/50 z-10">
        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">
          Zone d&apos;action ORMVAG
        </p>
        <p className="text-[9px] text-slate-500">Cliquez sur une province pour explorer</p>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-2 shadow-md border border-slate-200/50 z-10">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Statuts</p>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 mb-0.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[9px] font-semibold text-slate-600">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
