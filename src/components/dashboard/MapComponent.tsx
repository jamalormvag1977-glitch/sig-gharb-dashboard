"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCE_COLORS } from "@/data/types";

interface MapProps {
  geojsonData: GeoJSON.FeatureCollection | null;
  selectedCommune: string | null;
  selectedProvince: string | null;
  onCommuneClick: (commune: string) => void;
}

export default function MapComponent({
  geojsonData,
  selectedCommune,
  selectedProvince,
  onCommuneClick,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  // Initialize map once
  useEffect(() => {
    const newMap = L.map("map-container", {
      center: [34.5, -5.8],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(newMap);

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri", maxZoom: 18 }
    );

    const osmBase = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    });

    const baseLayers = {
      Plan: osmBase,
      Satellite: satellite,
    };

    L.control.layers(baseLayers, {}).addTo(newMap);
    mapRef.current = newMap;

    return () => {
      newMap.remove();
      mapRef.current = null;
    };
  }, []);

  // Update geo layer when data or selections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojsonData) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
    }

    const maxCost = Math.max(
      ...geojsonData.features
        .filter((f) => f.properties?.has_project)
        .map((f) => f.properties?.cout_total || 0)
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

    const layer = L.geoJSON(geojsonData as any, {
      style: (feature) => {
        const props = feature?.properties;
        if (!props?.has_project) {
          return {
            fillColor: "#f0f0f0",
            weight: 0.5,
            opacity: 0.5,
            color: "#ccc",
            fillOpacity: 0.3,
          };
        }

        if (selectedProvince && props.province_project !== selectedProvince) {
          return {
            fillColor: "#f0f0f0",
            weight: 0.5,
            opacity: 0.3,
            color: "#ddd",
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
          weight: 1,
          opacity: 0.8,
          color: "#555",
          fillOpacity: 0.7,
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        if (!props) return;

        const name = props.commune_orig || props.NAME_4;

        if (props.has_project) {
          const costMDH = (props.cout_total / 1e6).toFixed(2);
          layer.bindTooltip(
            `<div style="font-weight:bold;font-size:13px;">${name}</div>
             <div style="font-size:11px;">${props.province_project}</div>
             <div style="font-size:12px;">${props.nb_projets} projets | ${costMDH} MDH</div>`,
            { sticky: true, className: "custom-tooltip" }
          );

          layer.on({
            click: () => {
              if (props.commune_orig) {
                onCommuneClick(props.commune_orig);
              }
            },
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                weight: 2.5,
                color: "#1a1a1a",
                fillOpacity: 0.9,
              });
              l.bringToFront();
            },
            mouseout: (e) => {
              const l = e.target;
              const isSelected =
                selectedCommune && props.commune_orig === selectedCommune;
              l.setStyle({
                weight: isSelected ? 3 : 1,
                color: isSelected ? "#1a1a1a" : "#555",
                fillOpacity: isSelected ? 0.85 : 0.7,
              });
            },
          });
        } else {
          layer.bindTooltip(
            `<div style="font-size:12px;color:#888;">${name}</div>`,
            { sticky: true }
          );
        }
      },
    }).addTo(map);

    geoLayerRef.current = layer;

    if (geojsonData.features.length > 0) {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  }, [geojsonData, selectedCommune, selectedProvince, onCommuneClick]);

  return (
    <div
      id="map-container"
      className="w-full h-full rounded-lg overflow-hidden"
    />
  );
}
