import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteFeature, SitesGeoJSON } from "../types";

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

export default function MapView({ sites }: { sites: SitesGeoJSON }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-117.85, 33.75],
      zoom: 9.5,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("sites", { type: "geojson", data: sites as never });
      map.addLayer({
        id: "sites",
        type: "circle",
        source: "sites",
        paint: {
          "circle-radius": 5,
          "circle-color": colorExpression(),
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000000",
        },
      });

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

      map.on("mouseenter", "sites", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "sites", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sites]);

  return <div ref={containerRef} className="map" />;
}
