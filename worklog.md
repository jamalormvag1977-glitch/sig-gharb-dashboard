# Worklog — Task 2: Add Interactive Project Markers to the Leaflet Map

**Date**: 2026-03-05
**Task ID**: 2
**File modified**: `/home/z/my-project/src/components/dashboard/MapComponent.tsx`

## Summary

Added interactive project markers (CircleMarkers) on top of the existing commune polygon layer in the Leaflet map. Each project is now visually represented as a circle marker colored by status and sized proportionally to budget.

## Changes Made

### 1. New Constants
- `STATUS_COLORS`: Maps project status to colors ("Terminé" → green #10b981, "En cours" → amber #f59e0b, "Non démarré" → red #ef4444)
- `STATUS_LABELS`: French labels for each status for use in popups/legend

### 2. New Refs
- `projectsLayerRef`: Tracks the `L.layerGroup` containing all project circle markers
- `legendRef`: Tracks the DOM element for the project status legend control

### 3. `buildProjectMarkers()` Helper Function
- Creates a `L.layerGroup` for all project markers
- Computes commune centroids from the GeoJSON layer using `layer.getBounds().getCenter()`
- For each project in each commune:
  - Creates a `L.circleMarker` at the commune centroid (with slight angular offset when multiple projects share the same commune)
  - Styles: `fillColor` = status color, `color` (border) = province color, `radius` = `Math.max(4, Math.min(15, Math.sqrt(p.cout / 1e6) * 3))`, `fillOpacity: 0.7`, `weight: 1.5`
  - Binds a rich popup showing: consistance, commune/province, budget/payé/ordonné (formatted MDH), avancement physique & financier with progress bars, and a status badge
  - Binds a tooltip showing project name, budget, and status on hover
- Adds the layer group to the map after the GeoJSON layer

### 4. `updateProjectLegend()` Helper Function
- Creates a Leaflet control positioned at `bottomright`
- Shows three status items with colored circles and labels
- Includes a "Taille ∝ budget" note
- Uses `L.DomUtil.create` for proper Leaflet control lifecycle

### 5. Integration into Existing Effect
- After the GeoJSON layer is added to the map, `buildProjectMarkers()` is called
- Previous project markers layer is removed when province changes
- `projectsByCommune` added to the useEffect dependency array so markers update when project data changes
- Legend is added during map initialization

### 6. CSS Styles
- `.project-marker-popup`: Rounded corners, shadow, padding for individual project popups
- `.project-marker-tooltip`: White background, subtle border, rounded corners for hover tooltips

## Design Decisions
- Used `L.circleMarker` instead of regular markers for better performance with 72 projects
- Slight angular offset (0.003 degrees) for projects sharing the same commune centroid to prevent overlap
- Popup design follows the specification with progress bars, status badge, and formatted currency
- Legend positioned at bottom-right to avoid overlap with the province/commune legend at bottom-left
- All existing functionality preserved (commune polygons, tooltips, popups, province/commune legend)

## Build Status
✅ `npx next build` passed successfully
