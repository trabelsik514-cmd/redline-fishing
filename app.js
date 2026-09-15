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
        const result = data.candidates[0];

const lat = result.location.y;
const lon = result.location.x;

selectedLocation = {
  lat: lat,
  lon: lon,
  name: result.address || query
};

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
// REAL WEATHER & SEA DATA
// =========================

const contentGrid = document.getElementById("contentGrid");
const contentTitle = document.getElementById("contentTitle");
const contentText = document.getElementById("contentText");

async function loadRealData(view) {

  if (!contentGrid) return;

  const lat = selectedLocation.lat;
  const lon = selectedLocation.lon;
  const place = selectedLocation.name;

  contentGrid.innerHTML =
    "<div class='info-card'>" +
    "<b>⏳</b>" +
    "<span>Chargement des données...</span>" +
    "</div>";

  try {

    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + lat +
      "&longitude=" + lon +
      "&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code" +
      "&hourly=temperature_2m,wind_speed_10m,wind_direction_10m" +
      "&forecast_days=3" +
      "&timezone=auto";

    const marineUrl =
      "https://marine-api.open-meteo.com/v1/marine" +
      "?latitude=" + lat +
      "&longitude=" + lon +
      "&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction" +
      "&hourly=wave_height,wave_period,wave_direction" +
      "&forecast_days=3" +
      "&timezone=auto";

    const [weatherResponse, marineResponse] =
      await Promise.all([
        fetch(weatherUrl),
        fetch(marineUrl)
      ]);

    if (!weatherResponse.ok || !marineResponse.ok) {
      throw new Error("API request failed");
    }

    const weather = await weatherResponse.json();
    const marine = await marineResponse.json();

    const temperature =
      weather.current?.temperature_2m ?? "--";

    const wind =
      weather.current?.wind_speed_10m ?? "--";

    const windDirection =
      weather.current?.wind_direction_10m ?? "--";

    const wave =
      marine.current?.wave_height ?? "--";

    const wavePeriod =
      marine.current?.wave_period ?? "--";

    const seaTemp =
      marine.current?.sea_surface_temperature ?? "--";

    const current =
      marine.current?.ocean_current_velocity ?? "--";

    const currentDirection =
      marine.current?.ocean_current_direction ?? "--";

    // =========================
    // METEO & MER
    // =========================

    if (view === "weather") {

      contentTitle.textContent = "Météo & Mer";

      contentText.textContent =
        "Conditions réelles pour " + place;

      contentGrid.innerHTML =

        "<div class='info-card'>" +
        "<b>🌡️</b>" +
        "<span>Température</span>" +
        "<strong>" + temperature + " °C</strong>" +
        "<small>Conditions actuelles</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>💨</b>" +
        "<span>Vent</span>" +
        "<strong>" + wind + " km/h</strong>" +
        "<small>Direction " + windDirection + "°</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>🌊</b>" +
        "<span>Hauteur des vagues</span>" +
        "<strong>" + wave + " m</strong>" +
        "<small>Période " + wavePeriod + " s</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>🌡️</b>" +
        "<span>Température de la mer</span>" +
        "<strong>" + seaTemp + " °C</strong>" +
        "<small>Surface de la mer</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>〰️</b>" +
        "<span>Courant marin</span>" +
        "<strong>" + current + " km/h</strong>" +
        "<small>Direction " + currentDirection + "°</small>" +
        "</div>";

    }

    // =========================
    // PECHE
    // =========================

    else if (view === "fishing") {

      contentTitle.textContent = "Pêche";

      contentText.textContent =
       "Conditions de pêche réelles pour " + place + ".";
      let status = "Conditions moyennes";
let status = "🟡 Conditions moyennes";

if (wind <= 15 && wave <= 1.2) {
  status = "🟢 Bonnes conditions";
}

if (wind > 25 || wave > 2) {
  status = "🔴 Conditions difficiles";
}
      contentGrid.innerHTML =

        "<div class='info-card'>" +
        "<b>🎣</b>" +
        "<span>État de la pêche</span>" +
        "<strong>" + status + "</strong>" +
        "<small>" + place + "</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>💨</b>" +
        "<span>Vent</span>" +
        "<strong>" + wind + " km/h</strong>" +
        "<small>Direction " + windDirection + "°</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>🌊</b>" +
        "<span>Mer</span>" +
        "<strong>" + wave + " m</strong>" +
        "<small>Vagues</small>" +
        "</div>";

    }

    // =========================
    // ESPECES
    // =========================

    else if (view === "species") {

      contentTitle.textContent = "Espèces";

      contentText.textContent =
        "Recommandations selon les conditions actuelles.";

      let species = "Daurade · Sar · Loup";

      if (wave > 1.5) {
        species = "Loup · Sar · Mérou";
      }

      contentGrid.innerHTML =

        "<div class='info-card'>" +
        "<b>🐟</b>" +
        "<span>Espèces recommandées</span>" +
        "<strong>" + species + "</strong>" +
        "<small>Selon les conditions marines</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>🌊</b>" +
        "<span>État de la mer</span>" +
        "<strong>" + wave + " m</strong>" +
        "<small>Hauteur des vagues</small>" +
        "</div>";

    }

    // =========================
    // ZONES
    // =========================

    else if (view === "zones") {

      contentTitle.textContent = "Zones";

      contentText.textContent =
        "Analyse des conditions autour de " + place;

      let recommendation = "Zone normale";

      if (wind <= 15 && wave <= 1.2) {
        recommendation = "⭐ Zone favorable";
      }

      if (wind > 25 || wave > 2) {
        recommendation = "⚠️ Zone déconseillée";
      }

      contentGrid.innerHTML =

        "<div class='info-card'>" +
        "<b>📍</b>" +
        "<span>Zone sélectionnée</span>" +
        "<strong>" + place + "</strong>" +
        "<small>" + recommendation + "</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>💨</b>" +
        "<span>Vent</span>" +
        "<strong>" + wind + " km/h</strong>" +
        "<small>Direction " + windDirection + "°</small>" +
        "</div>" +

        "<div class='info-card'>" +
        "<b>🌊</b>" +
        "<span>Vagues</span>" +
        "<strong>" + wave + " m</strong>" +
        "<small>Période " + wavePeriod + " s</small>" +
        "</div>";

    }

    // =========================
    // PREVISIONS
    // =========================

    else if (view === "forecast") {

      contentTitle.textContent = "Prévisions";

      contentText.textContent =
        "Prévisions météo et marines pour " + place;

      const times =
        weather.hourly?.time || [];

      const temps =
        weather.hourly?.temperature_2m || [];

      const winds =
        weather.hourly?.wind_speed_10m || [];

      const waves =
        marine.hourly?.wave_height || [];

      let html = "";

      for (let i = 0; i < Math.min(6, times.length); i++) {

        html +=
          "<div class='info-card'>" +
          "<b>🕐</b>" +
          "<span>" + times[i] + "</span>" +
          "<strong>" + temps[i] + " °C</strong>" +
          "<small>💨 " + winds[i] +
          " km/h · 🌊 " + waves[i] + " m</small>" +
          "</div>";

      }

      contentGrid.innerHTML = html;

    }

  } catch (error) {

    console.error(
      "Erreur API météo/mer :",
      error
    );

    contentGrid.innerHTML =
      "<div class='info-card'>" +
      "<b>⚠️</b>" +
      "<span>Erreur</span>" +
      "<strong>Données indisponibles</strong>" +
      "<small>Vérifiez votre connexion Internet.</small>" +
      "</div>";
  }
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
