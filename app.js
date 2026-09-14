document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // RED LINE FISHING - MAP
  // =========================

  const mapElement = document.getElementById("map");

  if (mapElement && typeof L !== "undefined") {

    const map = L.map("map", {
      zoomControl: false
    }).setView([35.8, 10.7], 7);

    // IMPORTANT:
    // ArcGIS satellite tiles are used instead of OpenStreetMap
    // to avoid the previous OSM 403 error.
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
      [34.74, 10.76, "Mahdia"]
    ];

    const spotLayer = L.layerGroup().addTo(map);

    spots.forEach(spot => {
      const marker = L.marker([spot[0], spot[1]], {
        icon: L.divIcon({
          className: "fish-pin",
          html: "🐟",
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        })
      });

      marker.bindPopup(
        `<b>🎣 ${spot[2]}</b><br>Zone de pêche`
      );

      marker.addTo(spotLayer);
    });

    // =========================
    // FISHING ZONES
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
    // MAP ZOOM BUTTONS
    // =========================

    const plus = document.getElementById("plus");
    const minus = document.getElementById("minus");

    if (plus) {
      plus.onclick = () => map.zoomIn();
    }

    if (minus) {
      minus.onclick = () => map.zoomOut();
    }

    // Make map resize correctly when switching pages
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }

  // =========================
  // PAGE NAVIGATION
  // =========================

  const content = {
    weather: {
      title: "Météo & Mer",
      text: "Conditions marines en temps réel, vent, vagues et température."
    },

    fishing: {
      title: "Pêche",
      text: "Consultez les zones recommandées et les conditions pour sortir en mer."
    },

    species: {
      title: "Espèces",
      text: "Daurade, Loup, Sar et autres espèces recommandées selon les conditions."
    },

    zones: {
      title: "Zones",
      text: "Explorez les zones de pêche autour de la Tunisie."
    },

    forecast: {
      title: "Prévisions",
      text: "Prévisions météo et marines pour vos prochaines sorties."
    },

    fav: {
      title: "Favoris",
      text: "Retrouvez ici vos zones et lieux de pêche favoris."
    },

    settings: {
      title: "Paramètres",
      text: "Personnalisez les paramètres de RED LINE FISHING."
    }
  };

  // =========================
  // NAV BUTTONS
  // =========================

  document.querySelectorAll(".nav").forEach(button => {

    button.addEventListener("click", () => {

      const view = button.dataset.view;

      document.querySelectorAll(".nav").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      // Map page
      if (view === "map") {
        document.querySelectorAll(".tab").forEach(tab => {
          tab.classList.remove("active");
        });

        const mapTab = document.querySelector('[data-view="map"]');

        if (mapTab) {
          mapTab.classList.add("active");
        }

        return;
      }

      // Other pages
      const data = content[view];

      if (!data) return;

      const pageTitle = document.querySelector(".page-title");
      const pageText = document.querySelector(".page-text");

      if (pageTitle) {
        pageTitle.textContent = data.title;
      }

      if (pageText) {
        pageText.textContent = data.text;
      }
    });

  });

  // =========================
  // FRENCH / ARABIC
  // =========================

  const arButton = document.getElementById("arBtn");

  if (arButton) {

    arButton.onclick = () => {

      const html = document.documentElement;

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
