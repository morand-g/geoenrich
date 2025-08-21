const translations = {
  en: {
    title: "GeoEnrich online",
    selectFile: "Select your occurrences file*:",
    formattingExamples: "Formatting examples",
    chooseFile: "Choose file or drag here",
    chooseVariable: "Choose a variable*:",
    catalog: "Catalog",
    bufferBoundaries: "Choose your buffer boundaries:",
    geoBuffer: "Geographical buffer (km):",
    timeStart: "Time period start (days):",
    timeEnd: "Time period end (days):",
    allDepths: "Use all depths level instead of surface only (not recommended)",
    continue: "Continue",
    documentation: "Documentation",
    codeSupport: "Code & Support",
    processingFile: "Processing your file... please wait ⏳",
    g2oiProject: "This website is being developed as part of the G2OI project, cofinanced by the European union, the Reunion region, and the French Republic.",
    download: "Download",
    previewFile: "Preview File",
    hidePreview: "Hide Preview",
    preview: "Preview",
    summaryStats: "Summary Stats"
  },
  fr: {
    title: "GeoEnrich en ligne",
    selectFile: "Sélectionnez votre fichier d'occurrences*:",
    formattingExamples: "Exemples de formatage",
    chooseFile: "Choisissez un fichier ou glissez ici",
    chooseVariable: "Choisissez une variable*:",
    catalog: "Catalogue",
    bufferBoundaries: "Choisissez vos limites de tampon :",
    geoBuffer: "Tampon géographique (km) :",
    timeStart: "Début de la période (jours) :",
    timeEnd: "Fin de la période (jours) :",
    allDepths: "Utiliser tous les niveaux de profondeur au lieu de la surface seulement (non recommandé)",
    continue: "Continuer",
    documentation: "Documentation",
    codeSupport: "Code & Support",
    processingFile: "Traitement de votre fichier... veuillez patienter ⏳",
    g2oiProject: "Ce site web est développé dans le cadre du projet G2OI, cofinancé par l'Union européenne, la région Réunion et la République française.",
    download: "Télécharger",
    previewFile: "Aperçu du fichier",
    hidePreview: "Masquer l'aperçu",
    summaryStats: "Statistiques résumées",
    preview: "Aperçu"
  },
  es: {
    title: "GeoEnrich en línea",
    selectFile: "Seleccione su archivo de ocurrencias*:",
    formattingExamples: "Ejemplos de formato",
    chooseFile: "Elija un archivo o arrástrelo aquí",
    chooseVariable: "Elija una variable*:",
    catalog: "Catálogo",
    bufferBoundaries: "Elija los límites del buffer:",
    geoBuffer: "Buffer geográfico (km):",
    timeStart: "Inicio del período (días):",
    timeEnd: "Fin del período (días):",
    allDepths: "Usar todos los niveles de profundidad en lugar de solo la superficie (no recomendado)",
    continue: "Continuar",
    documentation: "Documentación",
    codeSupport: "Código y Soporte",
    processingFile: "Procesando su archivo... por favor espere ⏳",
    g2oiProject: "Este sitio web se desarrolla como parte del proyecto G2OI, cofinanciado por la Unión Europea, la región de Reunión y la República Francesa.",
    download: "Descargar",
    previewFile: "Vista previa del archivo",
    hidePreview: "Ocultar vista previa",
    summaryStats: "Estadísticas resumidas",
    preview:"avance"

  }
};

// Function to apply translations
function setLanguage(lang) {
  localStorage.setItem('selectedLang', lang); // save selection
  document.getElementById("language-select").value = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(translations[lang] && translations[lang][key]){
      if (el.tagName === "INPUT" && el.type === "submit") {
        el.value = translations[lang][key]; // for submit buttons
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });
}

let userLang = localStorage.getItem('selectedLang'); // check saved language

if (!userLang) {
  // fallback to browser language
  userLang = navigator.language || navigator.userLanguage;
  if(userLang.startsWith('en')) userLang = 'en';
  else if(userLang.startsWith('es')) userLang = 'es';
  else userLang = 'fr'; // default to French if not en/es
}

// Apply language
setLanguage(userLang);

