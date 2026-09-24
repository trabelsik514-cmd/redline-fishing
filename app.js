
let language = "fr";

function startApp() {
    alert(
        language === "fr"
            ? "Red Line Fishing est prêt à démarrer."
            : "ريد لاين فيشينغ جاهز للانطلاق."
    );
}

function toggleLanguage() {
    language = language === "fr"
        ? "ar"
        : "fr";

    document.documentElement.lang = language;

    const langBtn = document.getElementById("langBtn");

    if (language === "ar") {
        langBtn.textContent = "🌐 AR";

        document.getElementById("subtitle").textContent =
            "رفيقك في البحر";

        document.getElementById("weatherTitle").textContent =
            "الطقس والبحر";

        document.getElementById("weatherText").textContent =
            "حالة البحر والطقس.";

        document.getElementById("fishingTitle").textContent =
            "الصيد";

        document.getElementById("fishingText").textContent =
            "حضّر رحلات الصيد الخاصة بك.";

        document.getElementById("portsTitle").textContent =
            "الموانئ";

        document.getElementById("portsText").textContent =
            "اكتشف الموانئ التونسية.";

    } else {
        langBtn.textContent = "🌐 FR";

        document.getElementById("subtitle").textContent =
            "Votre allié en mer";

        document.getElementById("weatherTitle").textContent =
            "Météo & Mer";

        document.getElementById("weatherText").textContent =
            "Conditions marines et météo.";

        document.getElementById("fishingTitle").textContent =
            "Pêche";

        document.getElementById("fishingText").textContent =
            "Préparez vos sorties de pêche.";

        document.getElementById("portsTitle").textContent =
            "Ports";

        document.getElementById("portsText").textContent =
            "Découvrez les ports tunisiens.";
    }
}
