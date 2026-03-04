import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  onCountryClick?: (countryName: string, countryCode: string) => void;
  highlightCorrect?: string;
  highlightWrong?: string;
  clickedCountry?: string;
  revealed?: boolean;
  interactive?: boolean;
  mapCenter?: [number, number];
  mapZoom?: number;
  onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
  heatmapData?: Record<string, string>;
}

export default function WorldMap({
  onCountryClick,
  highlightCorrect,
  highlightWrong,
  clickedCountry,
  revealed,
  interactive = true,
  mapCenter = [-10, 0],
  mapZoom = 1,
  onMoveEnd,
  heatmapData,
}: WorldMapProps) {
  const getGeoClass = (geoId: string) => {
    if (!geoId || heatmapData) return "";
    if (revealed) {
      if (highlightCorrect && geoId === highlightCorrect) return "geo-correct-pulse";
      if (highlightWrong && geoId === highlightWrong) return "geo-wrong";
      return "";
    }
    if (clickedCountry && geoId === clickedCountry) return "geo-clicked";
    if (interactive) return "geo-awaiting";
    return "";
  };

  const getStyle = (geoId: string) => {
    if (heatmapData) {
      const color = (geoId && heatmapData[geoId]) || "#2a3a4a";
      return {
        default: { fill: color, stroke: "#4a6a8a", strokeWidth: 0.5, outline: "none" },
        hover: { fill: color, stroke: "#7fb8e0", strokeWidth: 0.75, outline: "none" },
        pressed: { fill: color, stroke: "#7fb8e0", strokeWidth: 0.75, outline: "none" },
      };
    }

    if (revealed) {
      if (highlightCorrect && geoId === highlightCorrect) {
        return {
          default: { fill: "#2ecc71", stroke: "#27ae60", strokeWidth: 1.2, outline: "none" },
          hover: { fill: "#2ecc71", stroke: "#27ae60", strokeWidth: 1.2, outline: "none" },
          pressed: { fill: "#2ecc71", stroke: "#27ae60", strokeWidth: 1.2, outline: "none" },
        };
      }
      if (highlightWrong && geoId === highlightWrong) {
        return {
          default: { fill: "#e74c3c", stroke: "#c0392b", strokeWidth: 1.2, outline: "none" },
          hover: { fill: "#e74c3c", stroke: "#c0392b", strokeWidth: 1.2, outline: "none" },
          pressed: { fill: "#e74c3c", stroke: "#c0392b", strokeWidth: 1.2, outline: "none" },
        };
      }
      return {
        default: { fill: "#1b2838", stroke: "#4a6a8a", strokeWidth: 0.5, outline: "none" },
        hover: { fill: "#1b2838", stroke: "#4a6a8a", strokeWidth: 0.5, outline: "none" },
        pressed: { fill: "#1b2838", stroke: "#4a6a8a", strokeWidth: 0.5, outline: "none" },
      };
    }

    if (clickedCountry && geoId === clickedCountry) {
      return {
        default: { fill: "#1a4a7a", stroke: "#2d7dd2", strokeWidth: 1, outline: "none" },
        hover: { fill: "#1a4a7a", stroke: "#2d7dd2", strokeWidth: 1, outline: "none" },
        pressed: { fill: "#1a4a7a", stroke: "#2d7dd2", strokeWidth: 1, outline: "none" },
      };
    }

    return {
      default: { fill: "#1b2838", stroke: "#4a6a8a", strokeWidth: 0.5, outline: "none" },
      hover: {
        fill: interactive ? "#2d7dd2" : "#1b2838",
        stroke: interactive ? "#7fb8e0" : "#4a6a8a",
        strokeWidth: interactive ? 0.75 : 0.5,
        outline: "none",
        cursor: interactive ? "pointer" : "default",
      },
      pressed: {
        fill: interactive ? "#1a5fa8" : "#1b2838",
        stroke: interactive ? "#7fb8e0" : "#4a6a8a",
        strokeWidth: interactive ? 0.75 : 0.5,
        outline: "none",
      },
    };
  };

  return (
    <div className="map-container">
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147,
        }}
        width={800}
        height={400}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={mapCenter}
          zoom={mapZoom}
          minZoom={1}
          maxZoom={8}
          onMoveEnd={(pos) => onMoveEnd?.(pos)}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  className={getGeoClass(geo.id)}
                  onClick={() => {
                    if (!heatmapData && interactive && !clickedCountry) {
                      onCountryClick?.(geo.properties.name, geo.id);
                    }
                  }}
                  style={getStyle(geo.id)}
                />
              ))
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
