document.addEventListener("DOMContentLoaded", () => {

  let map = null;
  let selectedLocation = {
  lat: 35.8,
  lon: 10.7,
  name: "Tunisie"
  };
  // =========================
  // MAP
  // =========================

  const mapElement = document.getElementById("map");

  if (mapElement && typeof L !== "undefined") {

    map = L.map("map", {
      zoomControl: false
    }).setView([35.8, 10.7], 7);

    // Satellite map - NO OpenStreetMap
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri"
      }
    ).addTo(map);

    // =========================
    // FISHING SPOTS
    // =========================

    const spots = [
      [37.0, 10.3, "Bizerte"],
      [36.86, 10.34, "Tunis"],
      [35.78, 10.64, "Sousse"],
      [35.78, 10.83, "Monastir"],
      [34.74, 10.76, "Mahdia"],
      [33.88, 10.85, "Djerba"]
    ];

    spots.forEach(spot => {

      L.marker([spot[0], spot[1]], {
        icon: L.divIcon({
          className: "fish-pin",
          html: "🐟",
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        })
      })
      .bindPopup(
        "<b>🎣 " + spot[2] + "</b><br>Zone de pêche"
      )
      .addTo(map);

    });

    // =========================
    // FISHING ZONE DOTS
    // =========================

    for (let i = 0; i < 35; i++) {

      const lat = 34.7 + Math.random() * 3;
      const lon = 9.6 + Math.random() * 3.5;

      L.circleMarker([lat, lon], {
        radius: 2,
        stroke: false,
        fillOpacity: 0.45
      }).addTo(map);

    }

    // =========================
    // ZOOM
    // =========================

    const plus = document.getElementById("plus");
    const minus = document.getElementById("minus");

    if (plus) {
      plus.onclick = () => map.zoomIn();
    }

    if (minus) {
      minus.onclick = () => map.zoomOut();
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }


  // =========================
  // SEARCH
  // =========================

  const searchInput = document.querySelector(
    '.search input, input[placeholder*="Rechercher"]'
  );

  if (searchInput) {

    const doSearch = async () => {

      const query = searchInput.value.trim();

      if (!query) return;

      try {

        searchInput.style.opacity = "0.6";

        const url =
          "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" +
          "?SingleLine=" + encodeURIComponent(query) +
          "&maxLocations=5" +
          "&outFields=*" +
          "&outSR=4326" +
          "&f=json";

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Geocoding request failed");
        }

        const data = await response.json();

        if (
          !data.candidates ||
          data.candidates.length === 0
        ) {
          alert("Lieu introuvable : " + query);
          return;
        }
        selectedLocation = {
        lat: lat,
        lon: lon,
        name: result.address || query
        };
        const result = data.candidates[0];

        const lat = result.location.y;
        const lon = result.location.x;

        // Move map to result
        if (map) {

          map.setView(
            [lat, lon],
            12,
            {
              animate: true
            }
          );

          L.marker([lat, lon])
            .addTo(map)
            .bindPopup(
              "<b>📍 " +
              (result.address || query) +
              "</b>"
            )
            .openPopup();
        }

      } catch (error) {

        console.error(
          "Erreur de recherche :",
          error
        );

        alert(
          "Impossible d'effectuer la recherche."
        );

      } finally {

        searchInput.style.opacity = "1";

      }
    };

    // ENTER
    searchInput.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {
          event.preventDefault();
          doSearch();
        }

      }
    );

  }


  // =========================
  // ARABIC / FRENCH
  // =========================

  const arButton =
    document.getElementById("arBtn");

  if (arButton) {

    arButton.onclick = () => {

      const html =
        document.documentElement;

      if (html.dir === "rtl") {

        html.dir = "ltr";
        html.lang = "fr";

      } else {

        html.dir = "rtl";
        html.lang = "ar";

      }

    };

  }

});
