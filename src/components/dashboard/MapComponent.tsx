"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SECTEUR_SHORT } from "@/data/types";
import type { Project } from "@/data/types";

interface MapProps {
  geojsonData: GeoJSON.FeatureCollection | null;
  selectedCommune: string | null;
  selectedProvince: string | null;
  onCommuneClick: (commune: string) => void;
  projectsByCommune?: Record<string, Project[]>;
}

const GAD_PROVINCE_MAP: Record<string, string> = {
  "Kénitra": "Kénitra",
  "Sidi Kacem": "SidiKacem",
};

const SIDI_SLIMANE_CERCLE = "SidiSliman";

const SECTEUR_DOT_COLORS: Record<string, string> = {
  "Assainissement & Drainage": "#ef4444",
  "Pistes agricoles": "#3b82f6",
  "Stations de pompage": "#f59e0b",
  "Réhabilitation équipements": "#10b981",
  "Génie civil": "#8b5cf6",
};

export default function MapComponent({
  geojsonData,
  selectedCommune,
  selectedProvince,
  onCommuneClick,
  projectsByCommune,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentProvinceRef = useRef<string | null>(null);
  const projectsRef = useRef<Record<string, Project[]> | undefined>(undefined);

  // Keep ref in sync without triggering re-renders
  projectsRef.current = projectsByCommune;

  // Initialize map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const newMap = L.map(container, {
      center: [34.6, -5.9],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 7,
      maxZoom: 16,
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri", maxZoom: 18 }
    );

    const labels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; CARTO", maxZoom: 18, pane: "overlayPane" }
    );

    satellite.addTo(newMap);
    labels.addTo(newMap);

    mapRef.current = newMap;

    const timeouts = [
      setTimeout(() => newMap.invalidateSize(), 50),
      setTimeout(() => newMap.invalidateSize(), 200),
      setTimeout(() => newMap.invalidateSize(), 500),
    ];

    const handleResize = () => newMap.invalidateSize();
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => newMap.invalidateSize());
      resizeObserver.observe(container);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
      newMap.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON layer and zoom when province changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojsonData) return;

    if (currentProvinceRef.current === selectedProvince && geoLayerRef.current) return;
    currentProvinceRef.current = selectedProvince;

    // Remove previous layers
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    const filteredFeatures = geojsonData.features.filter((feature) => {
      const props = feature.properties;
      if (!props) return false;

      if (!selectedProvince) {
        return props.has_project;
      }

      if (selectedProvince === "Sidi Slimane") {
        return props.NAME_3 === SIDI_SLIMANE_CERCLE;
      }

      if (selectedProvince === "Kénitra") {
        return props.NAME_2 === "Kénitra" && props.NAME_3 !== SIDI_SLIMANE_CERCLE;
      }

      const gadmProvince = GAD_PROVINCE_MAP[selectedProvince] || selectedProvince;
      return props.NAME_2 === gadmProvince;
    });

    if (filteredFeatures.length === 0) return;

    const maxCost = Math.max(
      ...filteredFeatures
        .filter((f) => f.properties?.has_project)
        .map((f) => f.properties?.cout_total || 0),
      1
    );

    const getColor = (cost: number) => {
      if (cost === 0) return "#e8e8e8";
      const ratio = cost / maxCost;
      if (ratio > 0.7) return "#b10026";
      if (ratio > 0.5) return "#e31a1c";
      if (ratio > 0.3) return "#fc4e2a";
      if (ratio > 0.15) return "#fd8d3c";
      if (ratio > 0.05) return "#fed976";
      return "#ffffcc";
    };

    const filteredCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filteredFeatures,
    };

    const layer = L.geoJSON(filteredCollection as any, {
      style: (feature) => {
        const props = feature?.properties;
        if (!props?.has_project) {
          return {
            fillColor: "#f0f0f0",
            weight: 0.5,
            opacity: 0.3,
            color: "#ccc",
            fillOpacity: 0.15,
          };
        }

        if (selectedCommune && props.commune_orig === selectedCommune) {
          return {
            fillColor: getColor(props.cout_total),
            weight: 3,
            opacity: 1,
            color: "#1a1a1a",
            fillOpacity: 0.85,
          };
        }

        return {
          fillColor: getColor(props.cout_total),
          weight: 1.5,
          opacity: 0.8,
          color: "#555",
          fillOpacity: 0.7,
        };
      },
      onEachFeature: (feature, lyr) => {
        const props = feature.properties;
        if (!props) return;

        const name = props.commune_orig || props.NAME_4;

        if (props.has_project) {
          const costMDH = (props.cout_total / 1e6).toFixed(2);

          // Permanent label showing data directly on the map
          lyr.bindTooltip(
            `<div style="text-align:center; line-height:1.3;">
              <div style="font-weight:bold; font-size:11px; color:#fff; text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);">${name}</div>
              <div style="font-size:10px; color:#ffe066; font-weight:700; text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5);">${costMDH} MDH</div>
              <div style="font-size:9px; color:#ddd; text-shadow: 0 1px 4px rgba(0,0,0,0.9);">${props.nb_projets} projet${props.nb_projets > 1 ? "s" : ""}</div>
            </div>`,
            {
              permanent: true,
              direction: "center",
              className: "commune-label-tooltip",
              offset: [0, 0],
            }
          );

          // Build detailed popup with all projects
          const communeProjects = projectsRef.current?.[name] || [];
          let popupHTML = `<div style="font-size:13px; max-width:420px; max-height:350px; overflow-y:auto;">
            <div style="font-weight:bold; font-size:16px; margin-bottom:2px; color:#1e293b;">${name}</div>
            <div style="color:#64748b; font-size:11px; margin-bottom:8px;">${props.province_project} — ${props.nb_projets} projet${props.nb_projets > 1 ? "s" : ""} — <strong style="color:#16a34a;">${costMDH} MDH</strong></div>`;

          if (communeProjects.length > 0) {
            popupHTML += `<table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="background:#f1f5f9; border-bottom:2px solid #e2e8f0;">
                  <th style="text-align:left; padding:4px 6px; color:#475569; font-size:10px;">Rubrique</th>
                  <th style="text-align:left; padding:4px 6px; color:#475569; font-size:10px;">Projet</th>
                  <th style="text-align:left; padding:4px 6px; color:#475569; font-size:10px;">Consistance</th>
                  <th style="text-align:right; padding:4px 6px; color:#475569; font-size:10px;">Coût</th>
                </tr>
              </thead>
              <tbody>`;

            communeProjects.forEach((p, i) => {
              const shortRub = SECTEUR_SHORT[p.intitule_rubrique] || p.intitule_rubrique;
              const dotColor = SECTEUR_DOT_COLORS[shortRub] || "#94a3b8";
              const bgColor = i % 2 === 0 ? "#fff" : "#f8fafc";
              popupHTML += `<tr style="background:${bgColor}; border-bottom:1px solid #f1f5f9;">
                <td style="padding:4px 6px; vertical-align:top;">
                  <span style="display:inline-flex; align-items:center; gap:3px; font-size:10px; color:${dotColor}; font-weight:600;">
                    <span style="width:6px; height:6px; border-radius:50%; background:${dotColor}; display:inline-block;"></span>
                    ${shortRub}
                  </span>
                </td>
                <td style="padding:4px 6px; vertical-align:top; color:#334155; font-weight:500;">${p.intitule_projet || "—"}</td>
                <td style="padding:4px 6px; vertical-align:top; color:#64748b; font-size:10px;">${p.consistance || "—"}</td>
                <td style="padding:4px 6px; text-align:right; font-weight:700; color:#16a34a; white-space:nowrap;">${p.cout.toLocaleString("fr-FR")} DH</td>
              </tr>`;
            });

            popupHTML += `</tbody></table>`;
          } else {
            popupHTML += `<div style="color:#94a3b8; font-size:11px; padding:8px 0;">Aucun détail disponible</div>`;
          }

          popupHTML += `</div>`;

          lyr.bindPopup(popupHTML, {
            className: "commune-detail-popup",
            maxWidth: 450,
            minWidth: 300,
          });

          lyr.on({
            click: () => {
              if (props.commune_orig) {
                onCommuneClick(props.commune_orig);
              }
            },
            mouseover: (e) => {
              e.target.setStyle({ weight: 3, color: "#1a1a1a", fillOpacity: 0.9 });
              e.target.bringToFront();
            },
            mouseout: (e) => {
              const isSelected = selectedCommune && props.commune_orig === selectedCommune;
              e.target.setStyle({
                weight: isSelected ? 3 : 1.5,
                color: isSelected ? "#1a1a1a" : "#555",
                fillOpacity: isSelected ? 0.85 : 0.7,
              });
            },
          });
        } else {
          lyr.bindTooltip(
            `<div style="font-size:12px; color:#888;">${name}</div>`,
            { sticky: true }
          );
        }
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    // Auto-zoom
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.setMaxBounds(null);

      if (selectedProvince) {
        let MIN_ZOOM = 10;
        if (selectedProvince === "Kénitra") MIN_ZOOM = 9;
        if (selectedProvince === "Sidi Kacem") MIN_ZOOM = 10;
        if (selectedProvince === "Sidi Slimane") MIN_ZOOM = 11;
        const center = bounds.getCenter();

        map.flyToBounds(bounds, {
          padding: [30, 30],
          maxZoom: 14,
          animate: true,
          duration: 1,
        });

        const ensureMinZoom = () => {
          map.off("zoomend", ensureMinZoom);
          map.off("moveend", ensureMinZoom);
          const currentZoom = map.getZoom();
          if (currentZoom < MIN_ZOOM) {
            map.flyTo(center, MIN_ZOOM, { duration: 0.6 });
          }
        };

        map.on("zoomend", ensureMinZoom);
        map.on("moveend", ensureMinZoom);

        setTimeout(() => {
          map.off("zoomend", ensureMinZoom);
          map.off("moveend", ensureMinZoom);
          const currentZoom = map.getZoom();
          if (currentZoom < MIN_ZOOM) {
            map.flyTo(center, MIN_ZOOM, { duration: 0.6 });
          }
        }, 1500);
      } else {
        const OVERVIEW_MIN_ZOOM = 10;
        const center = bounds.getCenter();

        map.flyToBounds(bounds, {
          padding: [20, 20],
          maxZoom: 14,
          animate: true,
          duration: 1,
        });

        const ensureOverviewZoom = () => {
          map.off("zoomend", ensureOverviewZoom);
          map.off("moveend", ensureOverviewZoom);
          const currentZoom = map.getZoom();
          if (currentZoom < OVERVIEW_MIN_ZOOM) {
            map.flyTo(center, OVERVIEW_MIN_ZOOM, { duration: 0.6 });
          }
        };

        map.on("zoomend", ensureOverviewZoom);
        map.on("moveend", ensureOverviewZoom);

        setTimeout(() => {
          map.off("zoomend", ensureOverviewZoom);
          map.off("moveend", ensureOverviewZoom);
          const currentZoom = map.getZoom();
          if (currentZoom < OVERVIEW_MIN_ZOOM) {
            map.flyTo(center, OVERVIEW_MIN_ZOOM, { duration: 0.6 });
          }
        }, 1500);
      }
    }
  }, [geojsonData, selectedCommune, selectedProvince, onCommuneClick]);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .commune-label-tooltip {
          background: rgba(0,0,0,0.55) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
          padding: 3px 6px !important;
          margin: 0 !important;
          border-radius: 4px !important;
          backdrop-filter: blur(2px);
        }
        .commune-label-tooltip::before {
          display: none !important;
        }
        .commune-detail-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          padding: 0;
        }
        .commune-detail-popup .leaflet-popup-content {
          margin: 0;
          padding: 12px 14px;
          line-height: 1.4;
        }
        .commune-detail-popup .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
      {/* Dark overlay outside province when selected */}
      {selectedProvince && (
        <div
          className="absolute inset-0 z-[400] pointer-events-none"
          style={{
            boxShadow: "inset 0 0 80px 60px rgba(10,22,40,0.7)",
          }}
        />
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
