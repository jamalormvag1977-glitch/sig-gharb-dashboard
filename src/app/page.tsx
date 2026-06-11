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
import type { DashboardData, CommuneSummary, Project, ProvinceData, SecteurData } from "@/data/types";

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
  CheckCircle2,
  Clock,
  CircleDot,
  Gauge,
  Wallet,
  Wrench,
  Upload,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent"),
  { ssr: false }
);


type ViewType = "overview" | "kenitra" | "sidi-kacem" | "sidi-slimane" | "suivi-avancement" | "suivi-kenitra" | "suivi-sidi-kacem" | "suivi-sidi-slimane" | "rapport";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "kenitra", label: "Kénitra", icon: Building2 },
  { id: "sidi-kacem", label: "Sidi Kacem", icon: Building2 },
  { id: "sidi-slimane", label: "Sidi Slimane", icon: Building2 },
  { id: "suivi-avancement", label: "Suivi Avancement", icon: Gauge },
  { id: "suivi-kenitra", label: "Avancement Kénitra", icon: Gauge },
  { id: "suivi-sidi-kacem", label: "Avancement Sidi Kacem", icon: Gauge },
  { id: "suivi-sidi-slimane", label: "Avancement Sidi Slimane", icon: Gauge },
  { id: "rapport", label: "Rapport", icon: FileText },
];

const PROVINCE_MAP: Record<ViewType, string | null> = {
  overview: null,
  kenitra: "Kénitra",
  "sidi-kacem": "Sidi Kacem",
  "sidi-slimane": "Sidi Slimane",
  "suivi-avancement": null,
  "suivi-kenitra": "Kénitra",
  "suivi-sidi-kacem": "Sidi Kacem",
  "suivi-sidi-slimane": "Sidi Slimane",
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

// Province-matched KPI colors (matching ORMVAG official map)
const KENITRA_COLOR = { gradient: "from-amber-500 to-yellow-600", bgGradient: "from-amber-50 to-yellow-50", textColor: "text-amber-700", iconBg: "bg-amber-100", iconColor: "text-amber-600" };
const SIDI_KACEM_COLOR = { gradient: "from-rose-500 to-pink-600", bgGradient: "from-rose-50 to-pink-50", textColor: "text-rose-700", iconBg: "bg-rose-100", iconColor: "text-rose-600" };
const SIDI_SLIMANE_COLOR = { gradient: "from-emerald-500 to-teal-600", bgGradient: "from-emerald-50 to-teal-50", textColor: "text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" };
const DEFAULT_KPI = { gradient: "from-violet-500 to-purple-600", bgGradient: "from-violet-50 to-purple-50", textColor: "text-violet-700", iconBg: "bg-violet-100", iconColor: "text-violet-600" };

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [geojsonData, setGeojsonData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const communeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Suivi-avancement filters
  const [filterSecteur, setFilterSecteur] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterCommune, setFilterCommune] = useState<string>("all");
  const [filterMois, setFilterMois] = useState<string>("all");
  const [filterSemaine, setFilterSemaine] = useState<string>("all");

  // Trigger map resize when fullscreen toggles
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
    return () => clearTimeout(t);
  }, [mapFullscreen]);

  // Reset filters when changing views
  useEffect(() => {
    setFilterSecteur("all");
    setFilterStatut("all");
    setFilterCommune("all");
    setFilterMois("all");
    setFilterSemaine("all");
  }, [activeView]);

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

  // Suivi-avancement: computed filtered data
  const suiviCommunes = useMemo(() => {
    if (!data) return [] as string[];
    const communes = [...new Set(data.projects.map(p => p.commune))].sort();
    return communes;
  }, [data]);

  const suiviData = useMemo(() => {
    if (!data) return null;
    let projects = data.projects;

    if (filterSecteur !== "all") projects = projects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
    if (filterStatut !== "all") projects = projects.filter(p => p.statut === filterStatut);
    if (filterCommune !== "all") projects = projects.filter(p => p.commune === filterCommune);

    const totalCost = projects.reduce((s, p) => s + p.cout, 0);
    const totalProjects = projects.length;
    const totalPaye = projects.reduce((s, p) => s + p.montant_paye, 0);
    const totalOrdonne = projects.reduce((s, p) => s + p.montant_ordonne, 0);
    const avancementPhysiqueGlobal = projects.length > 0 ? projects.reduce((s, p) => s + p.avancement_physique, 0) / projects.length : 0;
    const avancementFinancierGlobal = projects.length > 0 ? projects.reduce((s, p) => s + p.avancement_financier, 0) / projects.length : 0;

    const byProvince: Record<string, ProvinceData> = {};
    projects.forEach(p => {
      if (!byProvince[p.province]) {
        byProvince[p.province] = { nb_projets: 0, cout_total: 0, communes: 0, avancement_physique_moyen: 0, avancement_financier_moyen: 0, montant_paye_total: 0, montant_ordonne_total: 0 };
      }
      byProvince[p.province].nb_projets++;
      byProvince[p.province].cout_total += p.cout;
      byProvince[p.province].montant_paye_total += p.montant_paye;
      byProvince[p.province].montant_ordonne_total += p.montant_ordonne;
    });
    Object.keys(byProvince).forEach(prov => {
      const provProjects = projects.filter(p => p.province === prov);
      byProvince[prov].communes = new Set(provProjects.map(p => p.commune)).size;
      byProvince[prov].avancement_physique_moyen = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_physique, 0) / provProjects.length : 0;
      byProvince[prov].avancement_financier_moyen = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_financier, 0) / provProjects.length : 0;
    });

    const bySecteur: Record<string, SecteurData> = {};
    projects.forEach(p => {
      const key = p.intitule_rubrique;
      if (!bySecteur[key]) {
        bySecteur[key] = { nb_projets: 0, cout_total: 0, communes: 0, avancement_physique_moyen: 0, avancement_financier_moyen: 0, montant_paye_total: 0, montant_ordonne_total: 0 };
      }
      bySecteur[key].nb_projets++;
      bySecteur[key].cout_total += p.cout;
      bySecteur[key].montant_paye_total += p.montant_paye;
      bySecteur[key].montant_ordonne_total += p.montant_ordonne;
    });
    Object.keys(bySecteur).forEach(sec => {
      const secProjects = projects.filter(p => p.intitule_rubrique === sec);
      bySecteur[sec].communes = new Set(secProjects.map(p => p.commune)).size;
      bySecteur[sec].avancement_physique_moyen = secProjects.length > 0 ? secProjects.reduce((s, p) => s + p.avancement_physique, 0) / secProjects.length : 0;
      bySecteur[sec].avancement_financier_moyen = secProjects.length > 0 ? secProjects.reduce((s, p) => s + p.avancement_financier, 0) / secProjects.length : 0;
    });

    return { projects, byProvince, bySecteur, totalCost, totalProjects, totalPaye, totalOrdonne, avancementPhysiqueGlobal, avancementFinancierGlobal };
  }, [data, filterSecteur, filterStatut, filterCommune]);

  // Helper: get current week number
  const getCurrentWeek = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneDay = 86400000;
    return Math.ceil((diff / oneDay + start.getDay() + 1) / 7);
  };

  // 2026 weeks and months constants for traceability (Juin–Décembre 2026)
  const MONTHS_2026 = [
    { value: "6", label: "Juin 2026" },
    { value: "7", label: "Juillet 2026" },
    { value: "8", label: "Août 2026" },
    { value: "9", label: "Septembre 2026" },
    { value: "10", label: "Octobre 2026" },
    { value: "11", label: "Novembre 2026" },
    { value: "12", label: "Décembre 2026" },
  ];

  // Generate weeks of 2026 from Juin (week 23) to Décembre (week 52/53)
  const WEEKS_2026 = useMemo(() => {
    const weeks: { value: string; label: string; month: number }[] = [];
    const juin1 = new Date(2026, 5, 1); // June 1, 2026
    // ISO week: first week contains the year's first Thursday
    for (let w = 1; w <= 53; w++) {
      const jan4 = new Date(2026, 0, 4); // Jan 4 is always in week 1
      const jan4Day = jan4.getDay() || 7; // Monday=1..Sunday=7
      const mondayW1 = new Date(jan4);
      mondayW1.setDate(jan4.getDate() - jan4Day + 1);
      const mondayOfWeek = new Date(mondayW1);
      mondayOfWeek.setDate(mondayW1.getDate() + (w - 1) * 7);
      const sundayOfWeek = new Date(mondayOfWeek);
      sundayOfWeek.setDate(mondayOfWeek.getDate() + 6);
      if (mondayOfWeek.getFullYear() > 2026) break;
      // Only include weeks whose Monday is on or after June 1, 2026
      if (mondayOfWeek < juin1) continue;
      const month = mondayOfWeek.getMonth() + 1; // 1-12
      const fmt = (d: Date) => `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      weeks.push({ value: w.toString(), label: `S${w} (${fmt(mondayOfWeek)} - ${fmt(sundayOfWeek)})`, month });
    }
    return weeks;
  }, []);

  // Get month label from value
  const getMonthLabel = (val: string) => MONTHS_2026.find(m => m.value === val)?.label ?? val;

  // Simulate progress at a given week of 2026 (deterministic, traceable)
  // Projects progress from their current state back in time linearly
  // Project starts in Juin 2026 (week 23)
  const FIRST_WEEK_2026 = 23; // ISO week 23 = June 1, 2026
  const simulateProgressAtWeek = (currentValue: number, targetWeek: number): number => {
    const currentWeekNum = getCurrentWeek();
    // If target is current or future week, show current value
    if (targetWeek >= currentWeekNum) return currentValue;
    // If target is before project start, show starting value
    if (targetWeek < FIRST_WEEK_2026) return 0;
    // Linear progression: assume projects started at 0% in week 23
    const startValue = 0;
    const weeksElapsed = currentWeekNum - FIRST_WEEK_2026;
    if (weeksElapsed <= 0) return currentValue;
    const weeklyRate = (currentValue - startValue) / weeksElapsed;
    const weeksBeforeTarget = currentWeekNum - targetWeek;
    return Math.max(0, Math.min(100, currentValue - weeklyRate * weeksBeforeTarget));
  };

  // Simulate progress at a given month of 2026 (Juin–Décembre)
  const FIRST_MONTH_2026 = 6; // Juin
  const simulateProgressAtMonth = (currentValue: number, targetMonth: number): number => {
    const currentMonthNum = new Date().getMonth() + 1;
    if (targetMonth >= currentMonthNum) return currentValue;
    // If target is before project start (Juin), show 0
    if (targetMonth < FIRST_MONTH_2026) return 0;
    // Linear progression from Juin (0%)
    const startValue = 0;
    const monthsElapsed = currentMonthNum - FIRST_MONTH_2026;
    if (monthsElapsed <= 0) return currentValue;
    const monthlyRate = (currentValue - startValue) / monthsElapsed;
    const monthsBeforeTarget = currentMonthNum - targetMonth;
    return Math.max(0, Math.min(100, currentValue - monthlyRate * monthsBeforeTarget));
  };

  // Get selected week/month info for display
  const selectedWeekNum = filterSemaine !== "all" ? parseInt(filterSemaine) : null;
  const selectedMonthNum = filterMois !== "all" ? parseInt(filterMois) : null;

  // Helper: simulate weekly data for sparkline (deterministic, no Math.random)
  const getWeeklyData = (currentValue: number, weeks: number = 4) => {
    const result: number[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      if (i === 0) {
        result.push(currentValue);
      } else {
        // Deterministic: use a fixed step based on index
        const step = 3 + (i * 1.5);
        result.push(Math.max(0, currentValue - step * i));
      }
    }
    return result;
  };

  // Render a full province-specific suivi view
  const renderProvinceSuivi = (province: string, provColor: string) => {
    if (!data) return null;

    // Get province projects with filters
    let projects = data.projects.filter(p => p.province === province);
    if (filterSecteur !== "all") projects = projects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
    if (filterStatut !== "all") projects = projects.filter(p => p.statut === filterStatut);
    if (filterCommune !== "all") projects = projects.filter(p => p.commune === filterCommune);

    // All communes for this province (for dropdown)
    const allCommunes = [...new Set(data.projects.filter(p => p.province === province).map(p => p.commune))].sort();

    // Determine the time reference point
    const currentWeek = getCurrentWeek();
    const currentMonth = new Date().getMonth() + 1;
    const isHistoricalWeek = selectedWeekNum !== null;
    const isHistoricalMonth = selectedMonthNum !== null;
    const displayWeek = isHistoricalWeek ? selectedWeekNum! : currentWeek;
    const displayMonth = isHistoricalMonth ? selectedMonthNum! : (isHistoricalWeek ? WEEKS_2026.find(w => w.value === filterSemaine)?.month ?? currentMonth : currentMonth);

    // Compute current (actual) metrics
    const totalProjects = projects.length;
    const currentAP = totalProjects > 0 ? projects.reduce((s, p) => s + p.avancement_physique, 0) / totalProjects : 0;
    const currentAF = totalProjects > 0 ? projects.reduce((s, p) => s + p.avancement_financier, 0) / totalProjects : 0;

    // Apply time-based simulation
    let avancementPhysique = currentAP;
    let avancementFinancier = currentAF;
    if (isHistoricalWeek) {
      avancementPhysique = simulateProgressAtWeek(currentAP, selectedWeekNum!);
      avancementFinancier = simulateProgressAtWeek(currentAF, selectedWeekNum!);
    } else if (isHistoricalMonth) {
      avancementPhysique = simulateProgressAtMonth(currentAP, selectedMonthNum!);
      avancementFinancier = simulateProgressAtMonth(currentAF, selectedMonthNum!);
    }

    // Compute deltas vs previous period
    const prevWeekAP = isHistoricalWeek ? simulateProgressAtWeek(currentAP, Math.max(1, selectedWeekNum! - 1)) : simulateProgressAtWeek(currentAP, Math.max(1, currentWeek - 1));
    const prevWeekAF = isHistoricalWeek ? simulateProgressAtWeek(currentAF, Math.max(1, selectedWeekNum! - 1)) : simulateProgressAtWeek(currentAF, Math.max(1, currentWeek - 1));
    const deltaAP = avancementPhysique - prevWeekAP;
    const deltaAF = avancementFinancier - prevWeekAF;

    // Sector breakdown with time simulation
    const bySecteur: Record<string, { nb: number; cout: number; ap: number; af: number; currentAp: number; currentAf: number }> = {};
    projects.forEach(p => {
      const key = p.intitule_rubrique;
      if (!bySecteur[key]) bySecteur[key] = { nb: 0, cout: 0, ap: 0, af: 0, currentAp: 0, currentAf: 0 };
      bySecteur[key].nb++;
      bySecteur[key].cout += p.cout;
      bySecteur[key].currentAp += p.avancement_physique;
      bySecteur[key].currentAf += p.avancement_financier;
    });
    Object.keys(bySecteur).forEach(k => {
      const d = bySecteur[k];
      const cap = d.nb > 0 ? d.currentAp / d.nb : 0;
      const caf = d.nb > 0 ? d.currentAf / d.nb : 0;
      if (isHistoricalWeek) {
        d.ap = simulateProgressAtWeek(cap, selectedWeekNum!);
        d.af = simulateProgressAtWeek(caf, selectedWeekNum!);
      } else if (isHistoricalMonth) {
        d.ap = simulateProgressAtMonth(cap, selectedMonthNum!);
        d.af = simulateProgressAtMonth(caf, selectedMonthNum!);
      } else {
        d.ap = cap;
        d.af = caf;
      }
    });

    // Commune breakdown with time simulation
    const byCommune: Record<string, { nb: number; cout: number; ap: number; af: number; currentAp: number; currentAf: number }> = {};
    projects.forEach(p => {
      const key = p.commune;
      if (!byCommune[key]) byCommune[key] = { nb: 0, cout: 0, ap: 0, af: 0, currentAp: 0, currentAf: 0 };
      byCommune[key].nb++;
      byCommune[key].cout += p.cout;
      byCommune[key].currentAp += p.avancement_physique;
      byCommune[key].currentAf += p.avancement_financier;
    });
    Object.keys(byCommune).forEach(k => {
      const d = byCommune[k];
      const cap = d.nb > 0 ? d.currentAp / d.nb : 0;
      const caf = d.nb > 0 ? d.currentAf / d.nb : 0;
      if (isHistoricalWeek) {
        d.ap = simulateProgressAtWeek(cap, selectedWeekNum!);
        d.af = simulateProgressAtWeek(caf, selectedWeekNum!);
      } else if (isHistoricalMonth) {
        d.ap = simulateProgressAtMonth(cap, selectedMonthNum!);
        d.af = simulateProgressAtMonth(caf, selectedMonthNum!);
      } else {
        d.ap = cap;
        d.af = caf;
      }
    });

    // Filter weeks by selected month
    const filteredWeeks = filterMois !== "all"
      ? WEEKS_2026.filter(w => w.month === parseInt(filterMois))
      : WEEKS_2026;

    // Time period label
    const timeLabel = isHistoricalWeek
      ? `S${selectedWeekNum} — ${WEEKS_2026.find(w => w.value === filterSemaine)?.label ?? ""}`
      : isHistoricalMonth
      ? getMonthLabel(filterMois)
      : `Semaine ${currentWeek} en cours`;

    // ─── Inline helper: Gauge Ring (SVG) ───
    const GaugeRing = ({ value, maxValue = 100, color, size = 140, strokeWidth = 10, label, delta }: { value: number; maxValue?: number; color: string; size?: number; strokeWidth?: number; label: string; delta?: number }) => {
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const progress = Math.min(Math.max(value / maxValue, 0), 1);
      const offset = circumference * (1 - progress);
      const center = size / 2;
      return (
        <div className="flex flex-col items-center relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
            <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ width: size, height: size }}>
            <span className="text-2xl font-black" style={{ color }}>{value.toFixed(1)}%</span>
            {delta !== undefined && delta !== 0 && (
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {delta > 0 ? "▲" : "▼"}{delta > 0 ? "+" : ""}{delta.toFixed(1)}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-500 mt-1">{label}</span>
        </div>
      );
    };

    // ─── Inline helper: Mini Gauge (for commune cards) ───
    const MiniGauge = ({ value, color, size = 34 }: { value: number; color: string; size?: number }) => {
      const sw = 4;
      const r = (size - sw) / 2;
      const circ = 2 * Math.PI * r;
      const prog = Math.min(Math.max(value / 100, 0), 1);
      const off = circ * (1 - prog);
      const c = size / 2;
      return (
        <svg width={size} height={size} className="transform -rotate-90 shrink-0">
          <circle cx={c} cy={c} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
        </svg>
      );
    };

    // ─── Inline helper: Pie/Donut chart (SVG) ───
    const formatBudget = (v: number) => {
      if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M DH";
      if (v >= 1_000) return (v / 1_000).toFixed(0) + "K DH";
      return v.toFixed(0) + " DH";
    };

    // Compute status counts
    const statusCounts = {
      termine: projects.filter(p => p.statut === "Terminé").length,
      enCours: projects.filter(p => p.statut === "En cours").length,
      nonDemarre: projects.filter(p => p.statut === "Non démarré").length,
    };

    // Budget total for pie chart
    const totalBudget = projects.reduce((s, p) => s + p.cout, 0);

    // Sector data sorted by budget for pie + table
    const sectorEntries = Object.entries(bySecteur).sort(([, a], [, b]) => b.cout - a.cout);

    // Pie chart data: sector name, budget, color, percentage
    const pieData = sectorEntries.map(([name, d]) => {
      const shortName = SECTEUR_SHORT[name] || name;
      const dotColor = SECTEUR_DOT_COLORS[shortName] || "#94a3b8";
      return { name: shortName, budget: d.cout, color: dotColor, pct: totalBudget > 0 ? (d.cout / totalBudget) * 100 : 0 };
    });

    // Status donut data
    const statusDonutData = [
      { name: "Terminé", count: statusCounts.termine, color: "#10b981" },
      { name: "En cours", count: statusCounts.enCours, color: "#3b82f6" },
      { name: "Non démarré", count: statusCounts.nonDemarre, color: "#ef4444" },
    ].filter(d => d.count > 0);

    // Build SVG pie/donut slices
    const pieSize = 200;
    const pieR = 75;
    const pieInnerR = 45;
    const pieCx = pieSize / 2;
    const pieCy = pieSize / 2;

    const pieSlices = pieData.reduce<{ name: string; color: string; pct: number; path: string }[]>((acc, d, i) => {
      const startAngle = acc.length > 0 ? acc.reduce((s, x) => s + x.pct, 0) * 3.6 : 0;
      const endAngle = (acc.reduce((s, x) => s + x.pct, 0) + d.pct) * 3.6;
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      const x1o = pieCx + pieR * Math.cos(startRad);
      const y1o = pieCy + pieR * Math.sin(startRad);
      const x2o = pieCx + pieR * Math.cos(endRad);
      const y2o = pieCy + pieR * Math.sin(endRad);
      const x1i = pieCx + pieInnerR * Math.cos(endRad);
      const y1i = pieCy + pieInnerR * Math.sin(endRad);
      const x2i = pieCx + pieInnerR * Math.cos(startRad);
      const y2i = pieCy + pieInnerR * Math.sin(startRad);
      const path = `M${x1o},${y1o} A${pieR},${pieR} 0 ${largeArc} 1 ${x2o},${y2o} L${x1i},${y1i} A${pieInnerR},${pieInnerR} 0 ${largeArc} 0 ${x2i},${y2i} Z`;
      acc.push({ name: d.name, color: d.color, pct: d.pct, path });
      return acc;
    }, []);

    // Status donut slices
    const statusSize = 130;
    const statusR = 50;
    const statusInnerR = 30;
    const statusCx = statusSize / 2;
    const statusCy = statusSize / 2;
    const statusTotal = statusCounts.termine + statusCounts.enCours + statusCounts.nonDemarre;

    const statusSlices = statusDonutData.reduce<{ name: string; color: string; count: number; path: string }[]>((acc, d) => {
      const pct = statusTotal > 0 ? (d.count / statusTotal) * 100 : 0;
      const startAngle = acc.length > 0 ? acc.reduce((s, x) => s + (statusTotal > 0 ? (x.count / statusTotal) * 360 : 0), 0) : 0;
      const endAngle = startAngle + (statusTotal > 0 ? (d.count / statusTotal) * 360 : 0);
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      const x1o = statusCx + statusR * Math.cos(startRad);
      const y1o = statusCy + statusR * Math.sin(startRad);
      const x2o = statusCx + statusR * Math.cos(endRad);
      const y2o = statusCy + statusR * Math.sin(endRad);
      const x1i = statusCx + statusInnerR * Math.cos(endRad);
      const y1i = statusCy + statusInnerR * Math.sin(endRad);
      const x2i = statusCx + statusInnerR * Math.cos(startRad);
      const y2i = statusCy + statusInnerR * Math.sin(startRad);
      const path = `M${x1o},${y1o} A${statusR},${statusR} 0 ${largeArc} 1 ${x2o},${y2o} L${x1i},${y1i} A${statusInnerR},${statusInnerR} 0 ${largeArc} 0 ${x2i},${y2i} Z`;
      acc.push({ name: d.name, color: d.color, count: d.count, path });
      return acc;
    }, []);

    return (
      <div className="space-y-6">
        {/* ── Province header ── */}
        <div className="rounded-2xl overflow-hidden shadow-xl border-2" style={{ borderColor: provColor + "50" }}>
          <div className="px-6 py-4" style={{ background: `linear-gradient(135deg, ${provColor}, ${provColor}CC)` }}>
            <div className="flex items-center gap-3">
              <Gauge className="h-6 w-6 text-white/80" />
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-white">État d&apos;Avancement — {province}</h2>
                <p className="text-xs mt-0.5 text-white/50">Région du Gharb — ORMVAG — {timeLabel}</p>
              </div>
              {(isHistoricalWeek || isHistoricalMonth) && (
                <Badge className="text-[10px] font-bold px-3 py-1 border-0 bg-white/20 text-white backdrop-blur-sm">
                  <Calendar className="h-3 w-3 mr-1" /> Consultation historique
                </Badge>
              )}
            </div>
          </div>

          {/* KPI mini-cards */}
          <div className="px-4 py-4" style={{ background: `linear-gradient(135deg, ${provColor}08, ${provColor}03)` }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3" style={{ borderColor: provColor + "20" }}>
                <div className="p-2 rounded-lg" style={{ backgroundColor: provColor + "15" }}>
                  <Hash className="h-4 w-4" style={{ color: provColor }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nb Projets</p>
                  <p className="text-lg font-black text-slate-800 leading-tight">{totalProjects}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3" style={{ borderColor: provColor + "20" }}>
                <div className="p-2 rounded-lg" style={{ backgroundColor: provColor + "15" }}>
                  <Wallet className="h-4 w-4" style={{ color: provColor }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Budget Total</p>
                  <p className="text-lg font-black text-slate-800 leading-tight">{formatBudget(totalBudget)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3" style={{ borderColor: provColor + "20" }}>
                <div className="p-2 rounded-lg" style={{ backgroundColor: provColor + "15" }}>
                  <Wrench className="h-4 w-4" style={{ color: provColor }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Av. Physique</p>
                  <p className="text-lg font-black leading-tight" style={{ color: provColor }}>{avancementPhysique.toFixed(1)}%</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm p-3 flex items-center gap-3" style={{ borderColor: provColor + "20" }}>
                <div className="p-2 rounded-lg" style={{ backgroundColor: provColor + "15" }}>
                  <Wallet className="h-4 w-4" style={{ color: provColor }} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Av. Financier</p>
                  <p className="text-lg font-black leading-tight" style={{ color: provColor }}>{avancementFinancier.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            {/* Quick week navigation */}
            <div className="flex items-center justify-center gap-1 pt-3">
              <button
                onClick={() => {
                  const firstWeek = WEEKS_2026.length > 0 ? parseInt(WEEKS_2026[0].value) : 23;
                  const prev = Math.max(firstWeek, displayWeek - 1);
                  setFilterSemaine(prev.toString());
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-500 hover:text-slate-700"
                title="Semaine précédente"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-bold text-slate-500 px-2">S{displayWeek}</span>
              <button
                onClick={() => {
                  const lastWeek = WEEKS_2026.length > 0 ? parseInt(WEEKS_2026[WEEKS_2026.length - 1].value) : 52;
                  const next = Math.min(lastWeek, displayWeek + 1);
                  setFilterSemaine(next.toString());
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors text-slate-500 hover:text-slate-700"
                title="Semaine suivante"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFilterSemaine("all")}
                className="ml-2 text-[9px] font-bold text-slate-400 hover:text-slate-600 underline transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter bar (KEEP AS-IS) ── */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl border shadow-md p-3" style={{ borderColor: provColor + "40" }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Filter className="h-4 w-4" style={{ color: provColor }} />
            <span className="text-xs font-extrabold text-slate-700">Filtres</span>
            {(filterSecteur !== "all" || filterStatut !== "all" || filterCommune !== "all" || filterMois !== "all" || filterSemaine !== "all") && (
              <button
                onClick={() => { setFilterSecteur("all"); setFilterStatut("all"); setFilterCommune("all"); setFilterMois("all"); setFilterSemaine("all"); }}
                className="text-[10px] font-bold hover:opacity-70 ml-auto flex items-center gap-1 transition-colors"
                style={{ color: provColor }}
              >
                <XCircle className="h-3 w-3" /> Réinitialiser
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Mois filter */}
            <div className="relative">
              <select
                value={filterMois}
                onChange={e => {
                  setFilterMois(e.target.value);
                  setFilterSemaine("all");
                }}
                className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
              >
                <option value="all">Tous mois (Juin–Déc)</option>
                {MONTHS_2026.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            {/* Semaine filter */}
            <div className="relative">
              <select
                value={filterSemaine}
                onChange={e => setFilterSemaine(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors max-w-[220px]"
              >
                <option value="all">Toutes semaines (Juin–Déc)</option>
                {filteredWeeks.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            {/* Secteur filter */}
            <div className="relative">
              <select
                value={filterSecteur}
                onChange={e => setFilterSecteur(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
              >
                <option value="all">Tous secteurs</option>
                {Object.values(SECTEUR_SHORT).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            {/* Statut filter */}
            <div className="relative">
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
              >
                <option value="all">Tous statuts</option>
                <option value="Terminé">Terminé</option>
                <option value="En cours">En cours</option>
                <option value="Non démarré">Non démarré</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
            {/* Commune filter */}
            <div className="relative">
              <select
                value={filterCommune}
                onChange={e => setFilterCommune(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors max-w-[180px]"
              >
                <option value="all">Toutes communes</option>
                {allCommunes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {/* Active filter badges */}
          {(filterSecteur !== "all" || filterStatut !== "all" || filterCommune !== "all" || filterMois !== "all" || filterSemaine !== "all") && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
              {filterMois !== "all" && (
                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: provColor + "15", color: provColor }}>
                  <Calendar className="h-2.5 w-2.5 mr-0.5" />{getMonthLabel(filterMois)} <button onClick={() => { setFilterMois("all"); setFilterSemaine("all"); }} className="ml-1 hover:opacity-70">×</button>
                </Badge>
              )}
              {filterSemaine !== "all" && (
                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: provColor + "15", color: provColor }}>
                  <Calendar className="h-2.5 w-2.5 mr-0.5" />S{filterSemaine} <button onClick={() => setFilterSemaine("all")} className="ml-1 hover:opacity-70">×</button>
                </Badge>
              )}
              {filterSecteur !== "all" && (
                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: (SECTEUR_DOT_COLORS[filterSecteur] || "#94a3b8") + "15", color: SECTEUR_DOT_COLORS[filterSecteur] || "#94a3b8" }}>
                  {filterSecteur} <button onClick={() => setFilterSecteur("all")} className="ml-1 hover:opacity-70">×</button>
                </Badge>
              )}
              {filterStatut !== "all" && (
                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-slate-100 text-slate-600">
                  {filterStatut} <button onClick={() => setFilterStatut("all")} className="ml-1 hover:opacity-70">×</button>
                </Badge>
              )}
              {filterCommune !== "all" && (
                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: provColor + "10", color: provColor }}>
                  {filterCommune} <button onClick={() => setFilterCommune("all")} className="ml-1 hover:opacity-70">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* ── Gauge Rings + Status Donut ── */}
        <div className="bg-white rounded-2xl border shadow-lg p-5" style={{ borderColor: provColor + "30" }}>
          <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: provColor }} />
            Jaunes d&apos;Avancement
            {(isHistoricalWeek || isHistoricalMonth) && <span className="text-[9px] font-bold text-slate-400 ml-1">({timeLabel})</span>}
          </h4>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            <GaugeRing value={avancementPhysique} color={provColor} label="Avancement Physique" delta={deltaAP} size={150} strokeWidth={12} />
            <GaugeRing value={avancementFinancier} color={provColor} label="Avancement Financier" delta={deltaAF} size={150} strokeWidth={12} />
            {/* Status donut */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width={statusSize} height={statusSize}>
                  {statusSlices.map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" className="transition-all duration-700" />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-800">{statusTotal}</span>
                  <span className="text-[8px] font-bold text-slate-400">projets</span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 mt-1">Statut</span>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {statusDonutData.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] font-bold text-slate-600">{s.name} ({s.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pie Chart + Sector Table ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Pie chart (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border shadow-lg p-5" style={{ borderColor: provColor + "30" }}>
            <h4 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" style={{ color: provColor }} />
              Budget par Secteur
            </h4>
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width={pieSize} height={pieSize}>
                  {pieSlices.map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" className="transition-all duration-700" style={{ filter: `drop-shadow(0 1px 2px ${s.color}40)` }} />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-800">{formatBudget(totalBudget)}</span>
                  <span className="text-[8px] font-bold text-slate-400">Total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-4 space-y-1.5 w-full">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 px-1">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] font-bold text-slate-700 flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] font-black text-slate-500">{d.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector table (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: provColor + "30" }}>
            <div className="px-5 pt-4 pb-2" style={{ background: `linear-gradient(135deg, ${provColor}08, transparent)` }}>
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: provColor }} />
                Avancement par Secteur
                {(isHistoricalWeek || isHistoricalMonth) && <span className="text-[9px] font-bold text-slate-400 ml-1">({timeLabel})</span>}
              </h4>
            </div>
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, #1e293b, #334155)` }}>
                    <th className="text-left font-extrabold pb-2.5 pt-2 pr-2 pl-3 rounded-tl-lg text-slate-200">Secteur</th>
                    <th className="text-center font-extrabold pb-2.5 pt-2 px-1 text-slate-200">Nb</th>
                    <th className="text-right font-extrabold pb-2.5 pt-2 px-1 text-emerald-300">Budget</th>
                    <th className="text-center font-extrabold pb-2.5 pt-2 px-1 text-slate-200">Phys.</th>
                    <th className="text-center font-extrabold pb-2.5 pt-2 px-1 text-slate-200">Fin.</th>
                    <th className="text-center font-extrabold pb-2.5 pt-2 px-1 text-slate-200">Écart</th>
                    <th className="text-center font-extrabold pb-2.5 pt-2 pl-1 pr-3 rounded-tr-lg text-slate-200">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorEntries.map(([name, d], idx) => {
                    const shortName = SECTEUR_SHORT[name] || name;
                    const dotColor = SECTEUR_DOT_COLORS[shortName] || "#94a3b8";
                    const ecart = d.ap - d.af;
                    const avgPct = (d.ap + d.af) / 2;
                    const statusColor = avgPct > 75 ? "#10b981" : avgPct > 50 ? "#3b82f6" : avgPct > 25 ? "#8b5cf6" : "#ef4444";
                    const statusLabel = avgPct > 75 ? "Bon" : avgPct > 50 ? "Bon" : avgPct > 25 ? "Moyen" : "Faible";
                    return (
                      <tr key={name} className={`border-b transition-colors duration-150 ${idx % 2 === 0 ? "bg-white" : ""} hover:shadow-sm`} style={{ borderColor: dotColor + "15", background: idx % 2 !== 0 ? `${dotColor}06` : undefined }}>
                        <td className="py-2.5 pr-2 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}40` }} />
                            <span className="font-bold text-slate-800 truncate max-w-[120px]" title={shortName}>{shortName}</span>
                          </div>
                          <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.ap}%`, backgroundColor: dotColor, boxShadow: `inset 0 1px 2px ${dotColor}30` }} />
                          </div>
                        </td>
                        <td className="text-center font-bold text-slate-700 px-1"><span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black" style={{ backgroundColor: dotColor + "15", color: dotColor }}>{d.nb}</span></td>
                        <td className="text-right font-extrabold px-1" style={{ color: "#059669" }}>{formatBudget(d.cout)}</td>
                        <td className="text-center font-black px-1"><span className="text-[12px]" style={{ color: dotColor }}>{d.ap.toFixed(0)}%</span></td>
                        <td className="text-center font-black px-1"><span className="text-[12px] opacity-75" style={{ color: dotColor }}>{d.af.toFixed(0)}%</span></td>
                        <td className="text-center font-black px-1">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ecart >= 0 ? "#10b98112" : "#ef444412", color: ecart >= 0 ? "#10b981" : "#ef4444" }}>
                            {ecart >= 0 ? "▲" : "▼"}{Math.abs(ecart).toFixed(1)}
                          </span>
                        </td>
                        <td className="text-center pl-1 pr-3">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: statusColor, boxShadow: `0 2px 4px ${statusColor}40` }}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Commune Cards with Mini Gauges ── */}
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: provColor }} />
            Avancement par commune
            {(isHistoricalWeek || isHistoricalMonth) && <span className="text-[9px] font-bold text-slate-400 ml-1">({timeLabel})</span>}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byCommune)
              .sort(([, a], [, b]) => b.cout - a.cout)
              .map(([name, d]) => {
                const commColor = communeColorMap[name] || provColor;
                const prevCommAP = isHistoricalWeek
                  ? simulateProgressAtWeek(d.currentAp / d.nb, Math.max(1, selectedWeekNum! - 1))
                  : isHistoricalMonth
                  ? simulateProgressAtMonth(d.currentAp / d.nb, Math.max(1, selectedMonthNum! - 1))
                  : d.ap;
                const commDelta = d.ap - prevCommAP;
                return (
                  <div key={name} className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md transition-shadow" style={{ borderColor: commColor + "30" }}>
                    <div className="flex items-start gap-2.5">
                      {/* Mini gauge */}
                      <div className="relative shrink-0 mt-0.5">
                        <MiniGauge value={d.ap} color={commColor} size={38} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[7px] font-black" style={{ color: commColor }}>{d.ap.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-extrabold text-slate-800 truncate">{name}</span>
                          <Badge className="text-[7px] font-bold px-1.5 py-0 border-0 shrink-0" style={{ backgroundColor: commColor + "18", color: commColor }}>{d.nb}P</Badge>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mb-2">{formatBudget(d.cout)}</p>
                        {/* Physique bar */}
                        <div className="mb-1.5">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[8px] font-bold text-slate-500">Physique</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-black" style={{ color: commColor }}>{d.ap.toFixed(0)}%</span>
                              {commDelta !== 0 && (
                                <span className={`text-[7px] font-bold ${commDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  {commDelta > 0 ? "▲" : "▼"}{commDelta > 0 ? "+" : ""}{commDelta.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.ap}%`, background: `linear-gradient(90deg, ${commColor}, ${commColor}BB)` }} />
                          </div>
                        </div>
                        {/* Financier bar */}
                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[8px] font-bold text-slate-500">Financier</span>
                            <span className="text-[9px] font-black opacity-70" style={{ color: commColor }}>{d.af.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.af}%`, background: `linear-gradient(90deg, ${commColor}AA, ${commColor}77)` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ── Consultations Négociées ── */}
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" style={{ color: provColor }} />
            Consultations Négociées — Détail des Marchés
          </h4>
          <div className="overflow-x-auto rounded-xl border shadow-md" style={{ borderColor: provColor + "25" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, borderBottom: `2px solid ${provColor}50` }}>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-slate-200">N° Cons.</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-slate-200">Projet</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-slate-200">Société Titulaire</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">Ouv. Plis</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">Jugement</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">OSC</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">Délai</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">Récept. Prov.</TableHead>
                  <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-3 px-2.5 text-center text-slate-200">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p, i) => {
                  const fmtDate = (d: string) => {
                    if (!d) return <span className="text-slate-300">—</span>;
                    const dt = new Date(d);
                    return <span className="text-[9px] font-bold whitespace-nowrap inline-flex items-center gap-1" style={{ color: provColor + "CC" }}>{dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>;
                  };
                  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
                    "Terminé": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
                    "En cours": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Clock },
                    "Non démarré": { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", icon: CircleDot },
                  };
                  const sc = statusConfig[p.statut] || statusConfig["Non démarré"];
                  // OSC status: has OSC = green, no OSC but has jugement = yellow, no jugement = red
                  const oscStatus = p.date_osc ? "active" : p.date_jugement ? "pending" : "waiting";
                  const rowBg = i % 2 === 0 ? "bg-white" : "";
                  const rowAltBg = i % 2 !== 0 ? provColor + "06" : undefined;
                  return (
                    <TableRow key={i} className={`border-b transition-colors duration-150 hover:shadow-sm ${rowBg}`} style={{ borderLeftWidth: "3px", borderLeftColor: provColor + "40", borderBottomColor: provColor + "10", background: rowAltBg }}>
                      <TableCell className="py-2.5 px-2.5">
                        <span className="text-[9px] font-bold whitespace-nowrap inline-flex items-center justify-center w-6 h-5 rounded" style={{ backgroundColor: provColor + "12", color: provColor }}>{p.numero_consultation || "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-[9px] font-semibold text-slate-700 max-w-[200px] leading-relaxed whitespace-normal">{p.consistance.substring(0, 50)}{p.consistance.length > 50 ? "..." : ""}</TableCell>
                      <TableCell className="py-2.5 px-2.5">
                        {p.societe_titulaire ? (
                          <span className="text-[9px] font-bold text-slate-800 whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{p.societe_titulaire}</span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />En attente</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">{fmtDate(p.date_ouverture_plis)}</TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">{fmtDate(p.date_jugement)}</TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">
                        {p.date_osc ? (
                          <div className="flex flex-col items-center">
                            {fmtDate(p.date_osc)}
                            <Badge className="text-[7px] font-bold px-1.5 py-0.5 border-0 shadow-sm" style={{ backgroundColor: "#10b98120", color: "#059669" }}>Lancé</Badge>
                          </div>
                        ) : (
                          <Badge className={`text-[7px] font-bold px-1.5 py-0.5 border-0 ${oscStatus === "pending" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-50 text-slate-400"}`}>
                            {oscStatus === "pending" ? "En attente OSC" : "Non lancé"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">
                        <span className="text-[9px] font-bold inline-flex items-center gap-0.5" style={{ color: provColor + "CC" }}><Clock className="h-2.5 w-2.5" style={{ color: provColor + "80" }} />{p.delai_execution ? `${p.delai_execution}j` : "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">{fmtDate(p.date_reception_provisoire)}</TableCell>
                      <TableCell className="py-2.5 px-2.5 text-center">
                        <Badge className={`${sc.bg} ${sc.text} ${sc.border} border text-[8px] font-bold px-2 py-0.5 shadow-sm`}>
                          <sc.icon className="h-2.5 w-2.5 mr-0.5" />{p.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const handleCommuneClick = useCallback((commune: string) => {
    setSelectedCommune(commune);
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
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-2 rounded-lg shadow-lg shadow-green-600/20 shrink-0">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight truncate">ORMVAG — SIG Gharb</h1>
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
            if (item.id === "kenitra") { activeBg = "from-amber-500 to-yellow-600"; activeShadow = "shadow-amber-500/25"; }
            if (item.id === "sidi-kacem") { activeBg = "from-rose-500 to-pink-600"; activeShadow = "shadow-rose-500/25"; }
            if (item.id === "sidi-slimane") { activeBg = "from-emerald-500 to-teal-600"; activeShadow = "shadow-emerald-500/25"; }
            if (item.id === "rapport") { activeBg = "from-amber-500 to-orange-600"; activeShadow = "shadow-amber-500/25"; }
            if (item.id === "suivi-avancement") { activeBg = "from-indigo-500 to-violet-600"; activeShadow = "shadow-indigo-500/25"; }
            if (item.id === "suivi-kenitra") { activeBg = "from-amber-500 to-yellow-600"; activeShadow = "shadow-amber-500/25"; }
            if (item.id === "suivi-sidi-kacem") { activeBg = "from-rose-500 to-pink-600"; activeShadow = "shadow-rose-500/25"; }
            if (item.id === "suivi-sidi-slimane") { activeBg = "from-emerald-500 to-teal-600"; activeShadow = "shadow-emerald-500/25"; }

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
        <div>
        {/* Page Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* ORMVAG Logo */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-md ring-1 ring-green-400/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  {activeView === "overview" ? (
                    <>
                      <LayoutDashboard className="h-4 w-4 text-green-600" />
                      ORMVAG — Tableau de bord
                    </>
                  ) : activeView === "rapport" ? (
                    <>
                      <ClipboardCheck className="h-4 w-4 text-amber-600" />
                      Rapport d&apos;analyse
                    </>
                  ) : activeView === "suivi-avancement" ? (
                    <>
                      <Gauge className="h-4 w-4 text-indigo-600" />
                      Suivi d&apos;avancement physique et financier
                    </>
                  ) : activeView === "suivi-kenitra" ? (
                    <><Gauge className="h-4 w-4 text-amber-600" /> Suivi Avancement — Kénitra</>
                  ) : activeView === "suivi-sidi-kacem" ? (
                    <><Gauge className="h-4 w-4 text-rose-600" /> Suivi Avancement — Sidi Kacem</>
                  ) : activeView === "suivi-sidi-slimane" ? (
                    <><Gauge className="h-4 w-4 text-emerald-600" /> Suivi Avancement — Sidi Slimane</>
                  ) : (
                    <>
                      <Building2
                        className="h-4 w-4"
                        style={{ color: PROVINCE_COLORS[selectedProvince!] || "#6366f1" }}
                      />
                      Province de {selectedProvince}
                    </>
                  )}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0">
                  Office Régional de Mise en Valeur Agricole du Gharb — Kénitra
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/Canevas_Hebdomadaire_ORMVAG_Gharb.xlsx"
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.03] active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/30 hover:from-emerald-600 hover:to-teal-700"
                title="Télécharger le canevas hebdomadaire avec indicateurs physiques et financiers"
              >
                <FileDown className="h-4 w-4" />
                Canevas Hebdomadaire
              </a>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const XLSX = await import("xlsx");
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: "array" });
                    // Try to find the latest weekly sheet (S52 down to S01) or fallback to first sheet
                    const weekSheetNames = Array.from({ length: 52 }, (_, i) => `S${String(52 - i).padStart(2, "0")}`);
                    let sheetName = weekSheetNames.find(n => workbook.SheetNames.includes(n)) || workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                    if (!data) return;

                    const updatedProjects = [...data.projects];
                    let matchedCount = 0;

                    rows.forEach((row) => {
                      // Match by project number (N° column)
                      const num = row["N°"] ?? row["N°"];
                      const projectIndex = typeof num === "number" ? num - 1 : -1;
                      if (projectIndex < 0 || projectIndex >= updatedProjects.length) return;

                      // New canevas: "Avancement Physique %" is auto-calculated from quantities
                      const avPhys = row["Avancement Physique %"] ?? row["Avancement Physique Sem. Act. (%)"] ?? row["Avancement Physique (%)"];
                      const avFin = row["Avancement Financier %"] ?? row["Avancement Financier Sem. Act. (%)"] ?? row["Avancement Financier (%)"];
                      const decaisse = row["Montant Décaissé (DH)"] ?? row["Montant Décaissé Cumulé (DH)"];
                      const paye = row["Montant Payé (DH)"];
                      const ordonne = row["Montant Ordonné (DH)"];

                      if (avPhys !== undefined && avPhys !== "") {
                        updatedProjects[projectIndex] = {
                          ...updatedProjects[projectIndex],
                          avancement_physique: typeof avPhys === "number" ? Math.round(avPhys * 100) : Number(avPhys) || updatedProjects[projectIndex].avancement_physique,
                        };
                      }
                      if (avFin !== undefined && avFin !== "") {
                        updatedProjects[projectIndex] = {
                          ...updatedProjects[projectIndex],
                          avancement_financier: typeof avFin === "number" ? Math.round(avFin * 100) : Number(avFin) || updatedProjects[projectIndex].avancement_financier,
                        };
                      }
                      if (decaisse !== undefined && decaisse !== "") {
                        const decaisseVal = typeof decaisse === "number" ? decaisse : Number(decaisse) || 0;
                        updatedProjects[projectIndex] = {
                          ...updatedProjects[projectIndex],
                          montant_paye: paye !== undefined && paye !== "" ? (typeof paye === "number" ? paye : Number(paye) || decaisseVal) : decaisseVal,
                        };
                      }
                      if (paye !== undefined && paye !== "") {
                        const payeVal = typeof paye === "number" ? paye : Number(paye) || 0;
                        updatedProjects[projectIndex] = {
                          ...updatedProjects[projectIndex],
                          montant_paye: payeVal,
                        };
                      }
                      if (ordonne !== undefined && ordonne !== "") {
                        const ordonneVal = typeof ordonne === "number" ? ordonne : Number(ordonne) || 0;
                        updatedProjects[projectIndex] = {
                          ...updatedProjects[projectIndex],
                          montant_ordonne: ordonneVal,
                        };
                      }
                      matchedCount++;
                    });

                    setData({ ...data, projects: updatedProjects });
                    setImportStatus("success");
                    setImportMessage(`${matchedCount} projets mis à jour depuis le fichier Excel`);
                    setTimeout(() => { setImportStatus("idle"); setImportMessage(""); }, 4000);
                  } catch (err) {
                    console.error("Erreur import Excel:", err);
                    setImportStatus("error");
                    setImportMessage("Erreur lors de l'import du fichier Excel");
                    setTimeout(() => { setImportStatus("idle"); setImportMessage(""); }, 4000);
                  }
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.03] active:scale-95 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400/30 hover:from-blue-600 hover:to-indigo-700"
                title="Charger un fichier Excel pour mettre à jour le suivi physique et financier"
              >
                <Upload className="h-4 w-4" />
                Importer Excel
              </button>
              {importStatus !== "idle" && (
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                    importStatus === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {importStatus === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {importMessage}
                </div>
              )}
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
                      { label: "Projets / commune", value: (data.totalProjects / nbCommunes).toFixed(1), color: "#3b82f6", icon: MapPin },
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
          ) : activeView === "suivi-kenitra" || activeView === "suivi-sidi-kacem" || activeView === "suivi-sidi-slimane" ? (
            <>
              {activeView === "suivi-kenitra" && renderProvinceSuivi("Kénitra", PROVINCE_COLORS["Kénitra"])}
              {activeView === "suivi-sidi-kacem" && renderProvinceSuivi("Sidi Kacem", PROVINCE_COLORS["Sidi Kacem"])}
              {activeView === "suivi-sidi-slimane" && renderProvinceSuivi("Sidi Slimane", PROVINCE_COLORS["Sidi Slimane"])}
            </>
          ) : activeView === "suivi-avancement" ? (
            <div className="space-y-6">
              {/* Suivi Header */}
              <Card className="overflow-hidden shadow-xl border-indigo-200/60">
                <CardHeader className="py-5 px-6 bg-gradient-to-r from-indigo-700 to-violet-700">
                  <CardTitle className="text-lg font-extrabold text-white flex items-center gap-3">
                    <Gauge className="h-6 w-6 text-indigo-300" />
                    Suivi d&apos;Avancement Physique et Financier
                  </CardTitle>
                  <p className="text-indigo-200 text-xs mt-1">Région du Gharb — ORMVAG — Juin–Décembre 2026</p>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* ===== FILTER BAR ===== */}
                  {(() => {
                    const sd = suiviData ?? data;
                    const allProvinces = Object.keys(PROVINCE_COLORS);
                    const allCommunes = [...new Set(sd.projects.map(p => p.commune))].sort();
                    const filteredWeeks = filterMois !== "all"
                      ? WEEKS_2026.filter(w => w.month === parseInt(filterMois))
                      : WEEKS_2026;
                    const selectedWeekNum = filterSemaine !== "all" ? parseInt(filterSemaine) : null;
                    const selectedMonthNum = filterMois !== "all" ? parseInt(filterMois) : null;
                    const isHistoricalWeek = selectedWeekNum !== null;
                    const isHistoricalMonth = selectedMonthNum !== null;
                    const timeLabel = isHistoricalWeek
                      ? `S${selectedWeekNum} — ${WEEKS_2026.find(w => w.value === filterSemaine)?.label ?? ""}`
                      : isHistoricalMonth
                      ? getMonthLabel(filterMois)
                      : "En cours";
                    const hasFilters = filterSecteur !== "all" || filterStatut !== "all" || filterCommune !== "all" || filterMois !== "all" || filterSemaine !== "all";
                    return (
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl border shadow-md p-3 border-indigo-200/40">
                        <div className="flex items-center gap-2 mb-2.5">
                          <Filter className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-extrabold text-slate-700">Filtres</span>
                          {(isHistoricalWeek || isHistoricalMonth) && (
                            <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-indigo-100 text-indigo-700 ml-2">
                              <Calendar className="h-3 w-3 mr-0.5" /> Consultation historique — {timeLabel}
                            </Badge>
                          )}
                          {hasFilters && (
                            <button
                              onClick={() => { setFilterSecteur("all"); setFilterStatut("all"); setFilterCommune("all"); setFilterMois("all"); setFilterSemaine("all"); }}
                              className="text-[10px] font-bold hover:opacity-70 ml-auto flex items-center gap-1 text-indigo-600 transition-colors"
                            >
                              <XCircle className="h-3 w-3" /> Réinitialiser
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {/* Mois filter */}
                          <div className="relative">
                            <select
                              value={filterMois}
                              onChange={e => {
                                setFilterMois(e.target.value);
                                setFilterSemaine("all");
                              }}
                              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                            >
                              <option value="all">Tous mois (Juin–Déc)</option>
                              {MONTHS_2026.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                          {/* Semaine filter */}
                          <div className="relative">
                            <select
                              value={filterSemaine}
                              onChange={e => setFilterSemaine(e.target.value)}
                              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors max-w-[220px]"
                            >
                              <option value="all">Toutes semaines (Juin–Déc)</option>
                              {filteredWeeks.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                          {/* Secteur filter */}
                          <div className="relative">
                            <select
                              value={filterSecteur}
                              onChange={e => setFilterSecteur(e.target.value)}
                              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                            >
                              <option value="all">Tous secteurs</option>
                              {Object.values(SECTEUR_SHORT).map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                          {/* Statut filter */}
                          <div className="relative">
                            <select
                              value={filterStatut}
                              onChange={e => setFilterStatut(e.target.value)}
                              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors"
                            >
                              <option value="all">Tous statuts</option>
                              <option value="Terminé">Terminé</option>
                              <option value="En cours">En cours</option>
                              <option value="Non démarré">Non démarré</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                          {/* Commune filter */}
                          <div className="relative">
                            <select
                              value={filterCommune}
                              onChange={e => setFilterCommune(e.target.value)}
                              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-slate-700 cursor-pointer hover:border-indigo-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-colors max-w-[180px]"
                            >
                              <option value="all">Toutes communes</option>
                              {allCommunes.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        {/* Active filter badges */}
                        {hasFilters && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            {filterMois !== "all" && (
                              <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-indigo-100/60 text-indigo-700">
                                <Calendar className="h-2.5 w-2.5 mr-0.5" />{getMonthLabel(filterMois)} <button onClick={() => { setFilterMois("all"); setFilterSemaine("all"); }} className="ml-1 hover:opacity-70">×</button>
                              </Badge>
                            )}
                            {filterSemaine !== "all" && (
                              <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-indigo-100/60 text-indigo-700">
                                <Calendar className="h-2.5 w-2.5 mr-0.5" />S{filterSemaine} <button onClick={() => setFilterSemaine("all")} className="ml-1 hover:opacity-70">×</button>
                              </Badge>
                            )}
                            {filterSecteur !== "all" && (
                              <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: (SECTEUR_DOT_COLORS[filterSecteur] || "#94a3b8") + "15", color: SECTEUR_DOT_COLORS[filterSecteur] || "#94a3b8" }}>
                                {filterSecteur} <button onClick={() => setFilterSecteur("all")} className="ml-1 hover:opacity-70">×</button>
                              </Badge>
                            )}
                            {filterStatut !== "all" && (
                              <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-slate-100 text-slate-600">
                                {filterStatut} <button onClick={() => setFilterStatut("all")} className="ml-1 hover:opacity-70">×</button>
                              </Badge>
                            )}
                            {filterCommune !== "all" && (
                              <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-indigo-100/40 text-indigo-700">
                                {filterCommune} <button onClick={() => setFilterCommune("all")} className="ml-1 hover:opacity-70">×</button>
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Global progress gauges — filtered data */}
                  {(() => {
                    const sd = suiviData ?? data;
                    // Apply filters to projects
                    let filteredProjects = sd.projects;
                    if (filterSecteur !== "all") filteredProjects = filteredProjects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
                    if (filterStatut !== "all") filteredProjects = filteredProjects.filter(p => p.statut === filterStatut);
                    if (filterCommune !== "all") filteredProjects = filteredProjects.filter(p => p.commune === filterCommune);
                    const totalFiltered = filteredProjects.length;
                    const totalCostFiltered = filteredProjects.reduce((s, p) => s + p.cout, 0);
                    const payeFiltered = filteredProjects.reduce((s, p) => s + p.montant_paye, 0);
                    const ordonneFiltered = filteredProjects.reduce((s, p) => s + p.montant_ordonne, 0);
                    let ap = totalFiltered > 0 ? filteredProjects.reduce((s, p) => s + p.avancement_physique, 0) / totalFiltered : 0;
                    let af = totalFiltered > 0 ? filteredProjects.reduce((s, p) => s + p.avancement_financier, 0) / totalFiltered : 0;
                    // Apply time simulation
                    const isHistoricalWeek = filterSemaine !== "all";
                    const isHistoricalMonth = filterMois !== "all";
                    if (isHistoricalWeek) {
                      ap = simulateProgressAtWeek(ap, parseInt(filterSemaine));
                      af = simulateProgressAtWeek(af, parseInt(filterSemaine));
                    } else if (isHistoricalMonth) {
                      ap = simulateProgressAtMonth(ap, parseInt(filterMois));
                      af = simulateProgressAtMonth(af, parseInt(filterMois));
                    }
                    const tauxPaiement = totalCostFiltered > 0 ? (payeFiltered / totalCostFiltered) * 100 : 0;
                    const tauxOrdonnancement = totalCostFiltered > 0 ? (ordonneFiltered / totalCostFiltered) * 100 : 0;
                    const getStatusColor = (val: number) => val >= 75 ? "#10b981" : val >= 50 ? "#3b82f6" : val >= 25 ? "#8b5cf6" : "#ef4444";
                    const GaugeRing = ({ value, label, color, icon: Icon }: { value: number; label: string; color: string; icon: React.ElementType }) => {
                      const radius = 54;
                      const circ = 2 * Math.PI * radius;
                      const offset = circ - (value / 100) * circ;
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative w-32 h-32">
                            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                              <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                              <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <Icon className="h-4 w-4 mb-0.5" style={{ color }} />
                              <span className="text-2xl font-black" style={{ color }}>{value.toFixed(0)}%</span>
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">{label}</p>
                        </div>
                      );
                    };
                    return (
                      <>
                        <div className="flex flex-wrap justify-center gap-8">
                          <GaugeRing value={ap} label="Avancement physique" color={getStatusColor(ap)} icon={Wrench} />
                          <GaugeRing value={af} label="Avancement financier" color={getStatusColor(af)} icon={Wallet} />
                          <GaugeRing value={tauxOrdonnancement} label="Taux d'ordonnancement" color={getStatusColor(tauxOrdonnancement)} icon={FileText} />
                          <GaugeRing value={tauxPaiement} label="Taux de paiement" color={getStatusColor(tauxPaiement)} icon={Wallet} />
                        </div>
                        <div className="grid grid-cols-4 gap-3 mt-4">
                          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200/60 text-center">
                            <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Budget total</p>
                            <p className="text-lg font-black text-indigo-800">{(totalCostFiltered / 1e6).toFixed(1)} <span className="text-xs">MDH</span></p>
                          </div>
                          <div className="bg-violet-50 rounded-xl p-3 border border-violet-200/60 text-center">
                            <p className="text-[9px] font-bold text-violet-600 uppercase tracking-widest mb-1">Ordonnancé</p>
                            <p className="text-lg font-black text-violet-800">{(ordonneFiltered / 1e6).toFixed(1)} <span className="text-xs">MDH</span></p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200/60 text-center">
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Payé</p>
                            <p className="text-lg font-black text-emerald-800">{(payeFiltered / 1e6).toFixed(1)} <span className="text-xs">MDH</span></p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200/60 text-center">
                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Reste à payer</p>
                            <p className="text-lg font-black text-amber-800">{((totalCostFiltered - payeFiltered) / 1e6).toFixed(1)} <span className="text-xs">MDH</span></p>
                          </div>
                        </div>
                        {totalFiltered < sd.totalProjects && (
                          <p className="text-center text-[10px] font-bold text-indigo-500 mt-1">{totalFiltered} projets affichés sur {sd.totalProjects}</p>
                        )}
                      </>
                    );
                  })()}

                  {/* Status distribution — filtered */}
                  {(() => {
                    const sd = suiviData ?? data;
                    let filteredProjects = sd.projects;
                    if (filterSecteur !== "all") filteredProjects = filteredProjects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
                    if (filterStatut !== "all") filteredProjects = filteredProjects.filter(p => p.statut === filterStatut);
                    if (filterCommune !== "all") filteredProjects = filteredProjects.filter(p => p.commune === filterCommune);
                    const statuts = filteredProjects.reduce((acc, p) => {
                      acc[p.statut] = (acc[p.statut] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const termine = statuts["Terminé"] || 0;
                    const enCours = statuts["En cours"] || 0;
                    const nonDemarre = statuts["Non démarré"] || 0;
                    const total = filteredProjects.length;
                    const statusItems = [
                      { label: "Terminé", count: termine, color: "#10b981", icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200/60" },
                      { label: "En cours", count: enCours, color: "#3b82f6", icon: Clock, bg: "bg-blue-50", border: "border-blue-200/60" },
                      { label: "Non démarré", count: nonDemarre, color: "#ef4444", icon: CircleDot, bg: "bg-red-50", border: "border-red-200/60" },
                    ];
                    return (
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-indigo-500" />
                          Répartition par statut
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {statusItems.map((s) => (
                            <div key={s.label} className={`${s.bg} rounded-xl p-4 border ${s.border} text-center`}>
                              <s.icon className="h-5 w-5 mx-auto mb-1" style={{ color: s.color }} />
                              <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}% des projets</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Progress by province — filtered */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      Avancement par province
                    </h4>
                    <div className="space-y-3">
                      {(() => {
                        const sd = suiviData ?? data;
                        const provinceOrder = Object.keys(PROVINCE_COLORS);
                        const isHistoricalWeek = filterSemaine !== "all";
                        const isHistoricalMonth = filterMois !== "all";
                        return provinceOrder.map((name) => {
                          let provProjects = sd.projects.filter(p => p.province === name);
                          if (filterSecteur !== "all") provProjects = provProjects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
                          if (filterStatut !== "all") provProjects = provProjects.filter(p => p.statut === filterStatut);
                          if (filterCommune !== "all") provProjects = provProjects.filter(p => p.commune === filterCommune);
                          if (provProjects.length === 0) return null;
                          const provColor = PROVINCE_COLORS[name] || "#6366f1";
                          let ap = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_physique, 0) / provProjects.length : 0;
                          let af = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_financier, 0) / provProjects.length : 0;
                          if (isHistoricalWeek) {
                            ap = simulateProgressAtWeek(ap, parseInt(filterSemaine));
                            af = simulateProgressAtWeek(af, parseInt(filterSemaine));
                          } else if (isHistoricalMonth) {
                            ap = simulateProgressAtMonth(ap, parseInt(filterMois));
                            af = simulateProgressAtMonth(af, parseInt(filterMois));
                          }
                          const paye = provProjects.reduce((s, p) => s + p.montant_paye, 0);
                          const ordonne = provProjects.reduce((s, p) => s + p.montant_ordonne, 0);
                          const cout = provProjects.reduce((s, p) => s + p.cout, 0);
                          const ecart = ap - af;
                          const ecartLabel = ecart > 0 ? `Physique +${ecart.toFixed(0)}pts` : ecart < 0 ? `Financier +${Math.abs(ecart).toFixed(0)}pts` : "Équilibré";
                          const ecartColor = Math.abs(ecart) <= 5 ? "#10b981" : Math.abs(ecart) <= 15 ? "#8b5cf6" : "#ef4444";
                          const nbCommunes = new Set(provProjects.map(p => p.commune)).size;
                          return (
                            <div key={name} className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: provColor + "30", backgroundColor: provColor + "06" }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 rounded-full shadow" style={{ backgroundColor: provColor }} />
                                  <span className="text-sm font-extrabold text-slate-800">{name}</span>
                                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: provColor + "15", color: provColor }}>{provProjects.length} projets</Badge>
                                </div>
                                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: ecartColor + "18", color: ecartColor }}>{ecartLabel}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Wrench className="h-3 w-3" /> Physique</span>
                                    <span className="text-xs font-black" style={{ color: provColor }}>{ap.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full shadow-sm transition-all duration-700" style={{ width: `${ap}%`, backgroundColor: provColor }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Wallet className="h-3 w-3" /> Financier</span>
                                    <span className="text-xs font-black" style={{ color: provColor }}>{af.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full shadow-sm transition-all duration-700 opacity-70" style={{ width: `${af}%`, backgroundColor: provColor }} />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-semibold">
                                <span>Ordonnancé: {(ordonne / 1e6).toFixed(1)} MDH</span>
                                <span>Payé: {(paye / 1e6).toFixed(1)} MDH / {(cout / 1e6).toFixed(1)} MDH</span>
                                <span>{provProjects.length} projets / {nbCommunes} communes</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Progress by sector — filtered */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-500" />
                      Avancement par secteur
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const sd = suiviData ?? data;
                        let filteredProjects = sd.projects;
                        if (filterStatut !== "all") filteredProjects = filteredProjects.filter(p => p.statut === filterStatut);
                        if (filterCommune !== "all") filteredProjects = filteredProjects.filter(p => p.commune === filterCommune);
                        // Group by sector
                        const bySect: Record<string, { nb: number; cout: number; ap: number; af: number; ordonne: number; paye: number }> = {};
                        filteredProjects.forEach(p => {
                          const key = p.intitule_rubrique;
                          if (!bySect[key]) bySect[key] = { nb: 0, cout: 0, ap: 0, af: 0, ordonne: 0, paye: 0 };
                          bySect[key].nb++;
                          bySect[key].cout += p.cout;
                          bySect[key].ap += p.avancement_physique;
                          bySect[key].af += p.avancement_financier;
                          bySect[key].ordonne += p.montant_ordonne;
                          bySect[key].paye += p.montant_paye;
                        });
                        const isHistoricalWeek = filterSemaine !== "all";
                        const isHistoricalMonth = filterMois !== "all";
                        return Object.entries(bySect)
                          .sort(([, a], [, b]) => b.cout - a.cout)
                          .map(([name, d]) => {
                            const shortName = SECTEUR_SHORT[name] || name;
                            const dotColor = SECTEUR_DOT_COLORS[shortName] || "#94a3b8";
                            let ap = d.nb > 0 ? d.ap / d.nb : 0;
                            let af = d.nb > 0 ? d.af / d.nb : 0;
                            if (isHistoricalWeek) {
                              ap = simulateProgressAtWeek(ap, parseInt(filterSemaine));
                              af = simulateProgressAtWeek(af, parseInt(filterSemaine));
                            } else if (isHistoricalMonth) {
                              ap = simulateProgressAtMonth(ap, parseInt(filterMois));
                              af = simulateProgressAtMonth(af, parseInt(filterMois));
                            }
                            return (
                              <div key={name} className="rounded-xl border p-3" style={{ borderColor: dotColor + "25", backgroundColor: dotColor + "04" }}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: dotColor }} />
                                    <span className="text-xs font-extrabold text-slate-800">{shortName}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] font-bold">
                                    <span style={{ color: dotColor }}>Phys. {ap.toFixed(0)}%</span>
                                    <span className="text-slate-300">|</span>
                                    <span style={{ color: dotColor }} className="opacity-70">Fin. {af.toFixed(0)}%</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-violet-500">{(d.ordonne / 1e6).toFixed(1)} MDH ord.</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-emerald-500">{(d.paye / 1e6).toFixed(1)} MDH payé</span>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 h-2.5">
                                  <div className="flex-1 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full" style={{ width: `${ap}%`, backgroundColor: dotColor }} />
                                  </div>
                                  <div className="flex-1 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full opacity-60" style={{ width: `${af}%`, backgroundColor: dotColor }} />
                                  </div>
                                </div>
                                <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-semibold">
                                  <span>Physique</span>
                                  <span>Financier</span>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>

                  {/* Alert: projects behind schedule — filtered */}
                  {(() => {
                    const sd = suiviData ?? data;
                    let filteredProjects = sd.projects;
                    if (filterSecteur !== "all") filteredProjects = filteredProjects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
                    if (filterCommune !== "all") filteredProjects = filteredProjects.filter(p => p.commune === filterCommune);
                    const alertProjects = filteredProjects
                      .filter(p => p.statut === "En cours" && p.avancement_financier - p.avancement_physique > 20)
                      .sort((a, b) => (b.avancement_financier - b.avancement_physique) - (a.avancement_financier - a.avancement_physique))
                      .slice(0, 5);
                    if (alertProjects.length === 0) return null;
                    return (
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200/60">
                        <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          Projets en retard physique ({alertProjects.length} projets avec écart &gt; 20pts)
                        </h4>
                        <div className="space-y-1.5">
                          {alertProjects.map((p, i) => {
                            const ecart = p.avancement_financier - p.avancement_physique;
                            return (
                              <div key={i} className="flex items-center gap-2 text-[11px] text-red-700 bg-white rounded-lg px-3 py-2 border border-red-100">
                                <ArrowDownRight className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                <span className="flex-1 truncate"><strong>{p.commune}</strong> — {p.consistance.substring(0, 60)}...</span>
                                <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 bg-red-100 text-red-700">Phys. {p.avancement_physique}% vs Fin. {p.avancement_financier}%</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Detailed project table by province — filtered */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-slate-500" />
                      Détail de l&apos;avancement par projet
                    </h4>
                    <div className="space-y-6">
                      {(() => {
                        const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
                          "Terminé": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 },
                          "En cours": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: Clock },
                          "Non démarré": { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", icon: CircleDot },
                        };
                        const getApColor = (v: number) => v >= 75 ? "#10b981" : v >= 50 ? "#3b82f6" : v >= 25 ? "#8b5cf6" : "#ef4444";

                        // Get filtered projects
                        const sd = suiviData ?? data;
                        let baseProjects = sd.projects;
                        if (filterSecteur !== "all") baseProjects = baseProjects.filter(p => (SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique) === filterSecteur);
                        if (filterStatut !== "all") baseProjects = baseProjects.filter(p => p.statut === filterStatut);
                        if (filterCommune !== "all") baseProjects = baseProjects.filter(p => p.commune === filterCommune);

                        const provinceOrder = Object.keys(PROVINCE_COLORS);
                        const projectsByProvince = provinceOrder.reduce<Record<string, Project[]>>((acc, prov) => {
                          acc[prov] = baseProjects.filter(p => p.province === prov);
                          return acc;
                        }, {});

                        return provinceOrder.filter(prov => projectsByProvince[prov] && projectsByProvince[prov].length > 0).map((province) => {
                          const provProjects = projectsByProvince[province];
                          const provColor = PROVINCE_COLORS[province] || "#6366f1";
                          const provTotalBudget = provProjects.reduce((s, p) => s + p.cout, 0);
                          const provTotalOrdonne = provProjects.reduce((s, p) => s + p.montant_ordonne, 0);
                          const provTotalPaye = provProjects.reduce((s, p) => s + p.montant_paye, 0);
                          const provAvgPhys = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_physique, 0) / provProjects.length : 0;
                          const provAvgFin = provProjects.length > 0 ? provProjects.reduce((s, p) => s + p.avancement_financier, 0) / provProjects.length : 0;
                          const termine = provProjects.filter(p => p.statut === "Terminé").length;
                          const enCours = provProjects.filter(p => p.statut === "En cours").length;
                          const nonDemarre = provProjects.filter(p => p.statut === "Non démarré").length;

                          return (
                            <div key={province} className="rounded-2xl border-2 overflow-hidden shadow-lg" style={{ borderColor: provColor + "35" }}>
                              {/* Province header */}
                              <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: `linear-gradient(135deg, ${provColor}18 0%, ${provColor}08 100%)` }}>
                                <div className="flex items-center gap-2.5">
                                  <div className="w-4 h-4 rounded-full shadow-md ring-2 ring-white" style={{ backgroundColor: provColor }} />
                                  <span className="text-sm font-extrabold text-slate-800">Province de {province}</span>
                                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: provColor + "15", color: provColor }}>
                                    {provProjects.length} projets
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: "#10b98120", color: "#10b981" }}>
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{termine} Terminé
                                  </Badge>
                                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: "#3b82f620", color: "#3b82f6" }}>
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />{enCours} En cours
                                  </Badge>
                                  <Badge className="text-[9px] font-bold px-2 py-0.5 border-0" style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>
                                    <CircleDot className="h-2.5 w-2.5 mr-0.5" />{nonDemarre} Non démarré
                                  </Badge>
                                  <span className="font-extrabold px-3 py-1 rounded-lg text-[11px] shadow-sm" style={{ backgroundColor: provColor + "10", color: provColor, border: `1px solid ${provColor}25` }}>
                                    {(provTotalBudget / 1e6).toFixed(2)} MDH
                                  </span>
                                </div>
                              </div>

                              {/* Province progress bars */}
                              <div className="px-5 py-2.5 grid grid-cols-2 gap-3 bg-white/60 border-b" style={{ borderColor: provColor + "15" }}>
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Wrench className="h-3 w-3" /> Avancement Physique</span>
                                    <span className="text-[11px] font-black" style={{ color: provColor }}>{provAvgPhys.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${provAvgPhys}%`, backgroundColor: provColor }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Wallet className="h-3 w-3" /> Avancement Financier</span>
                                    <span className="text-[11px] font-black" style={{ color: provColor }}>{provAvgFin.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-700 opacity-70" style={{ width: `${provAvgFin}%`, backgroundColor: provColor }} />
                                  </div>
                                </div>
                              </div>

                              {/* Province project table */}
                              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: provColor + "20" }}>
                                <Table>
                                  <TableHeader>
                                    <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, borderBottom: `2px solid ${provColor}50` }}>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-slate-200">Commune</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-slate-200">Projet</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-right text-emerald-300">Budget</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-slate-200">Société</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Ouv. Plis</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Jugement</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">OSC</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Délai</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Phys.</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Fin.</TableHead>
                                      <TableHead className="text-[9px] font-extrabold uppercase tracking-wider py-2.5 px-2.5 text-center text-slate-200">Statut</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {provProjects.map((p, i) => {
                                      const ecart = p.avancement_financier - p.avancement_physique;
                                      const sc = statusConfig[p.statut] || statusConfig["Non démarré"];
                                      const apColor = getApColor(p.avancement_physique);
                                      const afColor = getApColor(p.avancement_financier);
                                      const fmtDate = (d: string) => {
                                        if (!d) return <span className="text-slate-300">—</span>;
                                        const dt = new Date(d);
                                        return <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: provColor + "BB" }}>{dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>;
                                      };
                                      const rowBg = i % 2 === 0 ? "bg-white" : "";
                                      const rowAltBg = i % 2 !== 0 ? provColor + "06" : undefined;
                                      return (
                                        <TableRow key={i} className={`border-b transition-colors duration-150 hover:shadow-sm ${rowBg}`} style={{ borderLeftWidth: "3px", borderLeftColor: provColor + "40", borderBottomColor: provColor + "10", background: rowAltBg }}>
                                          <TableCell className="py-2.5 px-2.5">
                                            <span className="text-[9px] font-bold whitespace-nowrap inline-flex items-center gap-1" style={{ color: provColor }}><MapPin className="h-2.5 w-2.5" style={{ color: provColor + "80" }} />{p.commune}</span>
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-[9px] font-semibold text-slate-700 max-w-[200px] leading-relaxed whitespace-normal">{p.consistance.substring(0, 50)}{p.consistance.length > 50 ? "..." : ""}</TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-[9px] font-extrabold text-right" style={{ color: "#059669" }}>{(p.cout / 1e6).toFixed(2)} M</TableCell>
                                          <TableCell className="py-2.5 px-2.5">
                                            {p.societe_titulaire ? (
                                              <span className="text-[8px] font-bold text-slate-800 whitespace-nowrap inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{p.societe_titulaire}</span>
                                            ) : (
                                              <span className="text-[8px] text-slate-400 italic inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />Attente</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">{fmtDate(p.date_ouverture_plis)}</TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">{fmtDate(p.date_jugement)}</TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">
                                            {p.date_osc ? (
                                              <div className="flex flex-col items-center">
                                                {fmtDate(p.date_osc)}
                                                <Badge className="text-[6px] font-bold px-1 py-0 border-0 shadow-sm" style={{ backgroundColor: "#10b98120", color: "#059669" }}>Lancé</Badge>
                                              </div>
                                            ) : (
                                              <Badge className={`text-[6px] font-bold px-1 py-0 border-0 ${p.date_jugement ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-400"}`}>
                                                {p.date_jugement ? "Attente" : "—"}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">
                                            <span className="text-[8px] font-bold inline-flex items-center gap-0.5" style={{ color: provColor + "CC" }}>{p.delai_execution ? `${p.delai_execution}j` : "—"}</span>
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.avancement_physique}%`, backgroundColor: apColor }} />
                                              </div>
                                              <span className="text-[9px] font-black min-w-[32px]" style={{ color: apColor }}>{p.avancement_physique}%</span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.avancement_financier}%`, backgroundColor: afColor }} />
                                              </div>
                                              <span className="text-[9px] font-black min-w-[32px]" style={{ color: afColor }}>{p.avancement_financier}%</span>
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-2.5 px-2.5 text-center">
                                            <Badge className={`${sc.bg} ${sc.text} ${sc.border} border text-[8px] font-bold px-2 py-0.5 shadow-sm`}>
                                              <sc.icon className="h-2.5 w-2.5 mr-0.5" />
                                              {p.statut}
                                            </Badge>
                                            {Math.abs(ecart) > 15 && p.statut === "En cours" && (
                                              <span className="block text-[7px] font-bold text-red-500 mt-0.5">Écart {ecart > 0 ? "-" : "+"}{Math.abs(ecart)}pts</span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    {/* Province total row */}
                                    <TableRow style={{ background: `linear-gradient(135deg, ${provColor}20, ${provColor}08)`, borderTop: `2px solid ${provColor}30` }}>
                                      <TableCell className="py-3 px-2.5 text-[10px] font-extrabold" style={{ color: provColor }} colSpan={3}>
                                        Total {province}
                                      </TableCell>
                                      <TableCell className="py-3 px-2.5 text-[9px] font-extrabold" style={{ color: provColor + "CC" }} colSpan={4}>
                                        {provProjects.reduce((s, p) => s + (p.societe_titulaire ? 1 : 0), 0)} marchés attribués
                                      </TableCell>
                                      <TableCell className="py-3 px-2.5 text-center">
                                        <span className="text-[10px] font-black" style={{ color: provColor }}>{provAvgPhys.toFixed(0)}%</span>
                                      </TableCell>
                                      <TableCell className="py-3 px-2.5 text-center">
                                        <span className="text-[10px] font-black" style={{ color: provColor }}>{provAvgFin.toFixed(0)}%</span>
                                      </TableCell>
                                      <TableCell className="py-3 px-2.5 text-center">
                                        <Badge className="text-[8px] font-bold px-2 py-0.5 border-0 shadow-sm" style={{ backgroundColor: provColor + "20", color: provColor }}>{provProjects.length} projets</Badge>
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
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
                      <TableRow className="border-b-2" style={{ background: `linear-gradient(135deg, #1e293b, #334155)` }}>
                        <TableHead className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider py-3.5 pl-5">
                          Commune
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider text-right py-3.5">
                          Projets
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider text-right py-3.5">
                          Coût (MDH)
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider text-right py-3.5">
                          Répartition
                        </TableHead>
                        <TableHead className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider py-3.5 pr-5">
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
                                  className={`border-b transition-all duration-200 ${
                                    idx % 2 === 0 ? "bg-white" : ""
                                  } hover:shadow-sm`}
                                  style={{ borderLeftWidth: "3px", borderLeftColor: commColor, borderBottomColor: commColor + "15", background: idx % 2 !== 0 ? `${commColor}06` : undefined }}
                                >
                                  <TableCell className="text-xs font-bold py-3 pl-5 text-slate-800">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/50" style={{ backgroundColor: commColor, boxShadow: `0 0 4px ${commColor}30` }} />
                                      {name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3">
                                    <Badge
                                      className="text-[10px] font-bold px-2.5 py-0.5 border-0 shadow-sm"
                                      style={{ backgroundColor: commColor + "18", color: commColor }}
                                    >
                                      {d.nb_projets}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3 font-extrabold text-emerald-600">
                                    {(d.cout_total / 1e6).toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-xs text-right py-3">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-20 h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(coutPct, 100)}%`, backgroundColor: commColor }}
                                        />
                                      </div>
                                      <span className="font-bold text-[10px] text-slate-600 w-10 text-right">{coutPct.toFixed(1)}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs py-3 pr-5">
                                    <span
                                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm"
                                      style={{
                                        backgroundColor: (SECTEUR_DOT_COLORS[shortSecteur] || "#94a3b8") + "12",
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
                            <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)` }}>
                              <TableCell className="text-xs font-extrabold py-3 text-white pl-5">Total</TableCell>
                              <TableCell className="text-xs text-right py-3">
                                <Badge className="bg-white/15 text-white text-[10px] font-bold px-2.5 border-0 shadow-sm">{summaryTotalProjects}</Badge>
                              </TableCell>
                              <TableCell className="text-xs text-right font-extrabold text-emerald-400 py-3">{(summaryTotalCost / 1e6).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right font-extrabold py-3 text-white">100%</TableCell>
                              <TableCell className="text-xs py-3 pr-5"></TableCell>
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
                                <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, borderBottom: `2px solid ${commColor}50` }}>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%] text-slate-200">
                                    Rubrique
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%] text-slate-200">
                                    Projet
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[27%] text-slate-200">
                                    Consistance
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[13%] text-emerald-300">
                                    Coût (DH)
                                  </TableHead>
                                  <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[17%] text-slate-200">
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
                                  <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, borderBottom: `2px solid ${dotColor}50` }}>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%] text-slate-200">Commune</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%] text-slate-200">Projet</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[35%] text-slate-200">Consistance</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[12%] text-emerald-300">Coût (DH)</TableHead>
                                    <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[10%] text-slate-200">Répart.</TableHead>
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
                                      <TableRow style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, borderBottom: `2px solid ${dotColor}50` }}>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[18%] text-slate-200">Commune</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[25%] text-slate-200">Projet</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider w-[35%] text-slate-200">Consistance</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[12%] text-emerald-300">Coût (DH)</TableHead>
                                        <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-right w-[10%] text-slate-200">Répart.</TableHead>
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
