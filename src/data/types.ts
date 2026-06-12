export type ProjectStatus = "Terminé" | "En cours" | "Non démarré";

export interface Project {
  province: string;
  commune: string;
  rubrique: string;
  intitule_rubrique: string;
  intitule_projet: string;
  consistance: string;
  cout: number;
  unite: string; // Unité physique : ml, km, m², m³, U
  qte_prevue: number; // Quantité prévue
  qte_realisee: number; // Quantité réalisée cumulée
  avancement_physique: number; // 0-100 % — calculé automatiquement = qte_realisee / qte_prevue
  avancement_financier: number; // 0-100 %
  montant_paye: number; // DH — montant effectivement payé
  montant_ordonne: number; // DH — montant ordonnancé (engagé mais non encore payé)
  statut: ProjectStatus;
  // Procurement / consultation fields
  numero_consultation: string; // N° de la consultation négociée
  societe_titulaire: string; // Société titulaire du marché
  date_ouverture_plis: string; // Date d'ouverture des plis (ISO: YYYY-MM-DD or "")
  date_jugement: string; // Date de jugement (ISO: YYYY-MM-DD or "")
  date_osc: string; // Date ordre de service de commencement (ISO: YYYY-MM-DD or "")
  delai_execution: number; // Délai d'exécution en jours
  date_reception_provisoire: string; // Date de réception provisoire (ISO: YYYY-MM-DD or "")
  observations: string; // Observations / remarques
}

export interface CommuneSummary {
  nb_projets: number;
  cout_total: number;
  province: string;
  rubriques: Record<string, number>;
  avancement_physique_moyen: number;
  avancement_financier_moyen: number;
  montant_paye_total: number;
  montant_ordonne_total: number;
}

export interface ProvinceData {
  nb_projets: number;
  cout_total: number;
  communes: number;
  avancement_physique_moyen: number;
  avancement_financier_moyen: number;
  montant_paye_total: number;
  montant_ordonne_total: number;
}

export interface SecteurData {
  nb_projets: number;
  cout_total: number;
  communes: number;
  avancement_physique_moyen: number;
  avancement_financier_moyen: number;
  montant_paye_total: number;
  montant_ordonne_total: number;
}

export interface DashboardData {
  projects: Project[];
  summary: Record<string, CommuneSummary>;
  byProvince: Record<string, ProvinceData>;
  bySecteur: Record<string, SecteurData>;
  totalCost: number;
  totalProjects: number;
  totalPaye: number;
  totalOrdonne: number;
  avancementPhysiqueGlobal: number;
  avancementFinancierGlobal: number;
}

export const SECTEUR_COLORS: Record<string, string> = {
  "Entretien et réparation du réseau d'assainissement et de drainage": "#f87171",
  "Travaux de pistes": "#60a5fa",
  "Entretien et réparation des stations de pompage": "#fbbf24",
  "Travaux de réhabilitation des équipements": "#34d399",
  "Travaux de réhabilitation des ouvrages de génie civil": "#a78bfa",
};

export const SECTEUR_SHORT: Record<string, string> = {
  "Entretien et réparation du réseau d'assainissement et de drainage": "Assainissement & Drainage",
  "Travaux de pistes": "Pistes agricoles",
  "Entretien et réparation des stations de pompage": "Stations de pompage",
  "Travaux de réhabilitation des équipements": "Réhabilitation équipements",
  "Travaux de réhabilitation des ouvrages de génie civil": "Génie civil",
};

export const PROVINCE_COLORS: Record<string, string> = {
  "Kénitra": "#92400e",
  "Sidi Slimane": "#065f46",
  "Sidi Kacem": "#9f1239",
};
