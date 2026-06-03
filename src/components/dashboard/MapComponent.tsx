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

const GAD_PROVINCE_MAP: Record<string, string> = {
  "Kénitra": "Kénitra",
  "Sidi Kacem": "SidiKacem",
};

const SIDI_SLIMANE_CERCLE = "SidiSliman";

// Gharb region bounds
const GHARB_BOUNDS: L.LatLngBoundsExpression = [
  [33.8, -6.8],
  [35.3, -5.0],
];

// Image overlay bounds - approximate bounds for the Arabic map
// The map covers the entire Gharb region (3 provinces)
const MAP_IMAGE_BOUNDS: L.LatLngBoundsExpression = [
  [34.05, -6.8],  // SW corner
  [35.05, -5.1],  // NE corner
];

export default function MapComponent({
  geojsonData,
  selectedCommune,
  selectedProvince,
  onCommuneClick,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentProvinceRef = useRef<string | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);

  // Initialize map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const newMap = L.map(container, {
      center: [34.6, -5.9],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 8,
      maxZoom: 15,
      maxBounds: GHARB_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri", maxZoom: 18 }
    );

    const osmBase = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    });

    // Arabic map image overlay
    const arabicMap = L.imageOverlay("/carte-provinces-arabe.jpg", MAP_IMAGE_BOUNDS, {
      opacity: 0.7,
      interactive: false,
    });

    osmBase.addTo(newMap);

    // Layer control with all options including the Arabic map overlay
    const baseMaps = {
      Plan: osmBase,
      Satellite: satellite,
    };
    const overlayMaps = {
      "Carte administrative (AR)": arabicMap,
    };
    L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(newMap);

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

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.setMaxBounds(bounds.pad(0.3));
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: selectedProvince ? 11 : 9,
        animate: true,
      });
    }
  }, [geojsonData, selectedCommune, selectedProvince, onCommuneClick]);

  return <div ref={containerRef} className="w-full h-full" />;
}
