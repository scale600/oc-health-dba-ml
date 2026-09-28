import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  AccessibilityRow,
  CitiesGeoJSON,
  HubLegendEntry,
  SiteFeature,
  SitesGeoJSON,
} from "../types";

const COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#eab308",
  "#06b6d4",
  "#f97316",
  "#a855f7",
  "#84cc16",
  "#f43f5e",
  "#22d3ee",
  "#d946ef",
];

function colorExpression(): maplibregl.ExpressionSpecification {
  const match: unknown[] = ["match", ["get", "cluster"]];
  COLORS.forEach((c, i) => match.push(i, c));
  match.push("#ffffff");
  return [
    "case",
    ["==", ["get", "is_noise"], 1],
    "#9ca3af",
    match,
  ] as unknown as maplibregl.ExpressionSpecification;
}

function choroplethExpression(): maplibregl.ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["get", "site_count"],
    0,
    "rgba(99, 102, 241, 0.04)",
    1,
    "rgba(99, 102, 241, 0.16)",
    3,
    "rgba(99, 102, 241, 0.30)",
    5,
    "rgba(99, 102, 241, 0.44)",
    10,
    "rgba(129, 140, 248, 0.56)",
    20,
    "rgba(165, 180, 252, 0.68)",
    27,
    "rgba(199, 210, 254, 0.82)",
  ] as unknown as maplibregl.ExpressionSpecification;
}

function citiesBounds(cities: CitiesGeoJSON): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const visit = (c: unknown): void => {
    if (
      Array.isArray(c) &&
      c.length === 2 &&
      typeof c[0] === "number" &&
      typeof c[1] === "number"
    ) {
      const [lng, lat] = c as [number, number];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(c)) {
      for (const x of c) visit(x);
    }
  };
  for (const f of cities.features) visit(f.geometry.coordinates);
  if (!isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

interface MapViewProps {
  sites: SitesGeoJSON;
  cities: CitiesGeoJSON;
  gaps: AccessibilityRow[];
  hubLegend: HubLegendEntry[];
}

export default function MapView({ sites, cities, gaps, hubLegend }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const boundsRef = useRef<[[number, number], [number, number]] | null>(null);

  // Mount once: create map, add sources + layers + handlers.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-117.85, 33.75],
      zoom: 9.5,
    });
    mapRef.current = map;

    map.on("load", () => {
      // --- city choropleth ---
      map.addSource("cities", {
        type: "geojson",
        data: cities as never,
        promoteId: "name",
      });
      map.addLayer({
        id: "cities-fill",
        type: "fill",
        source: "cities",
        paint: { "fill-color": choroplethExpression() },
      });
      map.addLayer({
        id: "cities-line",
        type: "line",
        source: "cities",
        paint: {
          "line-color": "#475569",
          "line-width": 1,
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "cities-hover",
        type: "fill",
        source: "cities",
        paint: {
          "fill-color": "#818cf8",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.5,
            0,
          ],
        },
      });

      // --- sites ---
      map.addSource("sites", { type: "geojson", data: sites as never });
      map.addLayer({
        id: "sites",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "provider_count"],
            1,
            3,
            5,
            5,
            15,
            7,
            40,
            10,
            80,
            13,
          ],
          "circle-color": colorExpression(),
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000000",
        },
      });

      // --- gap ZIP markers ---
      const gapGeoJSON = {
        type: "FeatureCollection",
        features: gaps.map((g) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [g.longitude, g.latitude] },
          properties: { zip: g.zip, nearest_km: g.nearest_km },
        })),
      };
      map.addSource("gaps", { type: "geojson", data: gapGeoJSON as never });
      map.addLayer({
        id: "gaps",
        type: "circle",
        source: "gaps",
        paint: {
          "circle-radius": 7,
          "circle-color": "#ef4444",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // --- popups ---
      const sitePopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });
      const cityPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });
      let hoveredCityId: string | null = null;

      map.on("click", "sites", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as unknown as SiteFeature["properties"];
        const coords = (feature.geometry as unknown as { coordinates: [number, number] })
          .coordinates;
        new maplibregl.Popup()
          .setLngLat(coords)
          .setHTML(
            `<strong>${props.name ?? "Unnamed"}</strong><br/>${props.city ?? ""} ${props.zip ?? ""}`
          )
          .addTo(map);
      });

      map.on("mousemove", "sites", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as unknown as SiteFeature["properties"];
        const hub = props.cluster != null ? `Hub ${props.cluster}` : "Isolated site";
        sitePopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>${props.name ?? "Unnamed"}</strong><br/>${props.city ?? ""} ${props.zip ?? ""}<br/>${hub}`
          )
          .addTo(map);
      });
      map.on("mouseleave", "sites", () => sitePopup.remove());

      map.on("mousemove", "cities-fill", (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredCityId !== null) {
            map.setFeatureState({ source: "cities", id: hoveredCityId }, { hover: false });
          }
          hoveredCityId = e.features[0].id as string;
          map.setFeatureState({ source: "cities", id: hoveredCityId }, { hover: true });
          const props = e.features[0].properties as unknown as {
            name: string;
            site_count: number;
          };
          cityPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>${props.name}</strong><br/>${props.site_count} site${
                props.site_count === 1 ? "" : "s"
              }`
            )
            .addTo(map);
        }
      });
      map.on("mouseleave", "cities-fill", () => {
        if (hoveredCityId !== null) {
          map.setFeatureState({ source: "cities", id: hoveredCityId }, { hover: false });
          hoveredCityId = null;
        }
        cityPopup.remove();
      });

      map.on("click", "gaps", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as unknown as { zip: string; nearest_km: number };
        const coords = (feature.geometry as unknown as { coordinates: [number, number] })
          .coordinates;
        new maplibregl.Popup()
          .setLngLat(coords)
          .setHTML(
            `<strong>ZIP ${props.zip}</strong><br/>${props.nearest_km.toFixed(1)} km to nearest site<br/>Service gap`
          )
          .addTo(map);
      });

      // --- cursor ---
      map.on("mouseenter", "sites", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "sites", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "cities-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cities-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      const b = citiesBounds(cities);
      boundsRef.current = b;
      if (b) map.fitBounds(b, { padding: 40 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update site dots when the filtered site list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("sites") as { setData(data: unknown): void } | undefined;
    src?.setData(sites);
  }, [sites]);

  const handleReset = () => {
    const map = mapRef.current;
    if (map && boundsRef.current) map.fitBounds(boundsRef.current, { padding: 40 });
  };

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <button className="reset-view" onClick={handleReset} type="button">
        Reset view
      </button>
      <div className="legend">
        <div className="legend-title">Service hubs</div>
        {hubLegend.map((h) => (
          <div className="legend-item" key={h.hub}>
            <span className="swatch" style={{ background: COLORS[h.hub] }} />
            <span>
              Hub {h.hub} — {h.city} ({h.count})
            </span>
          </div>
        ))}
        <div className="legend-item">
          <span className="swatch" style={{ background: "#9ca3af" }} />
          <span>Isolated site</span>
        </div>
        <div className="legend-title">Sites per city</div>
        <div className="choropleth-scale" />
        <div className="choropleth-labels">
          <span>0</span>
          <span>20+</span>
        </div>
        <div className="legend-title">Service gap</div>
        <div className="legend-item">
          <span className="swatch gap-dot" />
          <span>≥10 km to nearest site</span>
        </div>
      </div>
    </div>
  );
}
