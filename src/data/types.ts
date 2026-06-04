export type ProjectStatus = "Terminé" | "En cours" | "Non démarré";

export interface Project {
  province: string;
  commune: string;
  rubrique: string;
  intitule_rubrique: string;
  intitule_projet: string;
  consistance: string;
  cout: number;
  avancement_physique: number; // 0-100 %
  avancement_financier: number; // 0-100 %
  montant_paye: number; // DH — montant effectivement payé
  montant_ordonne: number; // DH — montant ordonnancé (engagé mais non encore payé)
  statut: ProjectStatus;
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
  "Entretien et réparation du réseau d'assainissement et de drainage": "#e74c3c",
  "Travaux de pistes": "#3498db",
  "Entretien et réparation des stations de pompage": "#f39c12",
  "Travaux de réhabilitation des équipements": "#2ecc71",
  "Travaux de réhabilitation des ouvrages de génie civil": "#9b59b6",
};

export const SECTEUR_SHORT: Record<string, string> = {
  "Entretien et réparation du réseau d'assainissement et de drainage": "Assainissement & Drainage",
  "Travaux de pistes": "Pistes agricoles",
  "Entretien et réparation des stations de pompage": "Stations de pompage",
  "Travaux de réhabilitation des équipements": "Réhabilitation équipements",
  "Travaux de réhabilitation des ouvrages de génie civil": "Génie civil",
};

export const PROVINCE_COLORS: Record<string, string> = {
  "Kénitra": "#d4a017",
  "Sidi Slimane": "#5bb58a",
  "Sidi Kacem": "#c76e7e",
};
