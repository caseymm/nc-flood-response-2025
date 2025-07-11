import "mapbox-gl/dist/mapbox-gl.css";
import "./App.scss";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null); // <- hold the map instance

  useEffect(() => {
    // Initialize map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-79.0984216, 35.8920466],
      zoom: 9,
    });

    const base = import.meta.env.BASE_URL || "/";

    mapRef.current.on("load", async () => {
      const [sheetData, w3w] = await Promise.all([
        fetch(`${base}sheetData.json`).then((res) => res.json()),
        fetch(`${base}w3w.json`).then((res) => res.json()),
      ]);
      console.log(sheetData, w3w);

      const geojson = {
        type: "FeatureCollection",
        features: w3w.map((pt) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
          properties: sheetData.find((item) => item.ID === pt.ID) || {},
        })),
      };

      // Add source
      mapRef.current.addSource("w3w-points", {
        type: "geojson",
        data: geojson,
      });

      // Add layer
      mapRef.current.addLayer({
        id: "w3w-circles",
        type: "circle",
        source: "w3w-points",
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "match",
            ["get", "Urgency"],
            "1",
            "#73aed9",
            "2",
            "#f1c40f",
            "3",
            "#fa8b02",
            "4",
            "#e74c3c",
            "#b8b8b8",
          ],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
        },
      });

      // Fit bounds to all points
      const bounds = new mapboxgl.LngLatBounds();
      geojson.features.forEach((f) => bounds.extend(f.geometry.coordinates));
      mapRef.current.fitBounds(bounds, { padding: 40 });

      // Set up popup
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        anchor: "top",
      });

      // Shared popup HTML generator
      const renderPopupContent = (props) =>
        Object.entries(props)
          .map(([key, value]) => {
            const label = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return `<strong>${label}:</strong> ${value || "Unknown"}`;
          })
          .join("<br>");

      // Shared event handler
      const showPopup = (e) => {
        const props = e.features[0].properties;
        const popupCoords = w3w.find((pt) => pt.ID === props.ID);
        const html = renderPopupContent(props);
        popup.setLngLat(popupCoords).setHTML(html).addTo(mapRef.current);
      };

      // Hover for desktop
      // mapRef.current.on("mouseenter", "w3w-circles", (e) => {
      //   mapRef.current.getCanvas().style.cursor = "pointer";
      //   showPopup(e);
      // });

      // mapRef.current.on("mouseleave", "w3w-circles", () => {
      //   mapRef.current.getCanvas().style.cursor = "";
      //   popup.remove();
      // });

      // Tap / click for mobile and desktop
      mapRef.current.on("click", (e) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, {
          layers: ["w3w-circles"],
        });

        if (!features.length) return;

        popup.remove(); // remove existing popup
        showPopup({ features, lngLat: e.lngLat });
      });
    });

    // Cleanup on unmount
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <>
      <div className="legend">
        <h1>2025 NC Flood Response Locations</h1>
        <div className="colors">
          <h3>Urgency</h3>
          <div>
            <span className="color-box" style={{ backgroundColor: "#73aed9" }}>
              1
            </span>
          </div>
          <div>
            <span className="color-box" style={{ backgroundColor: "#f1c40f" }}>
              2
            </span>
          </div>
          <div>
            <span className="color-box" style={{ backgroundColor: "#fa8b02" }}>
              3
            </span>
          </div>
          <div>
            <span
              className="color-box"
              style={{ backgroundColor: "#e74c3c", color: "#fff" }}
            >
              4
            </span>
          </div>
          <div>
            <span
              className="color-box"
              style={{ backgroundColor: "#b8b8b8", width: "40px" }}
            >
              Unk.
            </span>
          </div>
        </div>
      </div>
      <div id="map" ref={mapContainerRef} />
    </>
  );
}

export default App;
