let previewLoaded = false;
let previewVisible = false;
let cachedData = null;

async function previewCSV() {
  const resultsDiv = document.getElementById("results");
  const btn = document.getElementById("previewBtn"); // reference button
  let userLang = localStorage.getItem('selectedLang');
  // Toggle: if visible -> hide
  if (previewVisible) {
    resultsDiv.style.display = "none";
    previewVisible = false;
if(userLang === "fr") {
      btn.textContent = "Aperçu du fichier"; // update button text
    }
    else if(userLang === "es") {
      btn.textContent = "Vista previa del archivo"; // update button text
    }
    else if(userLang === "en") {
      btn.textContent = "Preview File"; // update button text
    }    
    return;
  }

  // If already loaded -> just show cached
  if (previewLoaded) {
    resultsDiv.style.display = "block";
    previewVisible = true;
    if(userLang === "fr") {
      btn.textContent = "Masquer l'aperçu"; // update button text
    }
    else if(userLang === "es") {
      btn.textContent = "Ocultar vista previa"; // update button text
    }
    else if(userLang === "en") {
      btn.textContent = "Hide Preview"; // update button text
    }
    return;
  }

  // First load: fetch CSV
  const res = await fetch("/getStats");
  const text = await res.text();

  Papa.parse(text, {
  header: true,
  preview: 10, // only up to 10 rows
  complete: (results) => {
    // Filter out completely empty rows
    const filtered = results.data.filter(row =>
      Object.values(row).some(val => val !== null && val !== "")
    );

    cachedData = filtered; // ✅ save only valid rows
    showPreview(cachedData);
    computeSummary(cachedData);
    resultsDiv.style.display = "block";

    previewLoaded = true;
    previewVisible = true;
    if(userLang === "fr") {
      btn.textContent = "Masquer l'aperçu"; // update button text
    }
    else if(userLang === "es") {
      btn.textContent = "Ocultar vista previa"; // update button text
    }
    else if(userLang === "en") {
      btn.textContent = "Hide Preview"; // update button text
    }
  }
});

}


function showPreview(data) {
  const table = document.getElementById("previewTable");
  table.innerHTML = "";

  if (!data.length) return;

  // Header row
  const headerRow = document.createElement("tr");
  Object.keys(data[0]).forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  // Data rows
  data.forEach(row => {
    const tr = document.createElement("tr");
    Object.values(row).forEach(val => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function computeSummary(data) {
  const summaryStats = document.getElementById("summaryStats");
  summaryStats.innerHTML = "";

  if (!data.length) return;

  const summary = {};
  Object.keys(data[0]).forEach(col => {
    const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((a,b) => a+b,0) / values.length;
      summary[col] = {min, max, mean};
    }
  });

  for (let [col, stats] of Object.entries(summary)) {
    const li = document.createElement("li");
    li.textContent = `${col}: min=${stats.min}, max=${stats.max}, mean=${stats.mean.toFixed(2)}`;
    summaryStats.appendChild(li);
  }
}
