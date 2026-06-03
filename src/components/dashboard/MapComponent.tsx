"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapProps {
  geojsonData: GeoJSON.FeatureCollection | null;
  selectedCommune: string | null;
  selectedProvince: string | null;
  onCommuneClick: (commune: string) => void;
}

// Province center coordinates and zoom levels for tight focus
const PROVINCE_BOUNDS: Record<string, { center: [number, number]; zoom: number }> = {
  "Kénitra": { center: [34.55, -5.95], zoom: 10 },
  "Sidi Kacem": { center: [34.85, -5.95], zoom: 10 },
  "Sidi Slimane": { center: [34.35, -5.95], zoom: 11 },
};

const GAD_PROVINCE_MAP: Record<string, string> = {
  "Kénitra": "Kénitra",
  "Sidi Kacem": "SidiKacem",
};

const SIDI_SLIMANE_CERCLE = "SidiSliman";

export default function MapComponent({
  geojsonData,
  selectedCommune,
  selectedProvince,
  onCommuneClick,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const provinceRef = useRef<string | null>(null);

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

    const osmBase = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    });

    // Start with OSM as default
    osmBase.addTo(newMap);

    L.control.layers({ Plan: osmBase, Satellite: satellite }, {}).addTo(newMap);
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

    // Remove existing layer
    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    // Filter features by province
    const filteredFeatures = geojsonData.features.filter((feature) => {
      const props = feature.properties;
      if (!props) return false;

      if (!selectedProvince) {
        // Overview: show only communes with projects in the Gharb region
        return props.has_project;
      }

      if (selectedProvince === "Sidi Slimane") {
        return props.NAME_3 === SIDI_SLIMANE_CERCLE;
      }

      if (selectedProvince === "Kénitra") {
        // Kénitra province: show communes under Kénitra but EXCLUDE Sidi Slimane cercle
        return props.NAME_2 === "Kénitra" && props.NAME_3 !== SIDI_SLIMANE_CERCLE;
      }

      // Sidi Kacem
      const gadmProvince = GAD_PROVINCE_MAP[selectedProvince] || selectedProvince;
      return props.NAME_2 === gadmProvince;
    });

    if (filteredFeatures.length === 0) {
      // If no features, set a default view for the province
      if (selectedProvince && PROVINCE_BOUNDS[selectedProvince]) {
        const { center, zoom } = PROVINCE_BOUNDS[selectedProvince];
        map.setView(center, zoom, { animate: true });
      }
      return;
    }

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
            fillColor: "#e8e8e8",
            weight: 0.5,
            opacity: 0.3,
            color: "#ccc",
            fillOpacity: 0.2,
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
          lyr.bindTooltip(
            `<div style="font-weight:bold;font-size:13px;">${name}</div>
             <div style="font-size:11px;">${props.province_project}</div>
             <div style="font-size:12px;">${props.nb_projets} projets | ${costMDH} MDH</div>`,
            { sticky: true, className: "custom-tooltip" }
          );

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
            `<div style="font-size:12px;color:#888;">${name}</div>`,
            { sticky: true }
          );
        }
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    // CRITICAL: Fit bounds ONLY to the filtered province features
    // Use a short delay to ensure the map container is properly sized
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      setTimeout(() => {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: selectedProvince ? 11 : 9,
          animate: true,
          duration: 0.5,
        });
      }, 100);
    }
  }, [geojsonData, selectedCommune, selectedProvince, onCommuneClick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
