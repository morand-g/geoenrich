const uploadBox = document.getElementById("uploadBox");
const uploadText = document.getElementById("uploadText");
const fileInput = document.getElementById("fileInput");
const startBtn = document.getElementById("startBtn");
const statsDiv = document.getElementById("stats");
const section2 = document.getElementById("section2");
const enrichBtn = document.getElementById("enrichBtn");
const progressContainer = document.getElementById("progressContainer");

const variableSelect = document.getElementById("variableSelect");
const selectedVariablesDiv = document.getElementById("selectedVariables");

let csvFile = null;
let selectedVariables = [];
let availableVariables = [];

/* =========================
   SECTION 1 – CSV UPLOAD
========================= */

uploadBox.addEventListener("click", () => fileInput.click());

uploadBox.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox.classList.add("dragover");
});

uploadBox.addEventListener("dragleave", () => {
  uploadBox.classList.remove("dragover");
});

uploadBox.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox.classList.remove("dragover");
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file || !file.name.endsWith(".csv")) return;
  csvFile = file;
  uploadText.textContent = file.name;
  startBtn.disabled = false;
}

startBtn.addEventListener("click", () => {
  const reader = new FileReader();
  reader.onload = () => processCSV(reader.result);
  reader.readAsText(csvFile);
});

function processCSV(text) {
  const rows = text.trim().split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const data = rows.slice(1);

  const dateColIndex = headers.findIndex(h => h.includes("date"));

  let html = `<strong>Rows:</strong> ${data.length}<br>`;

  if (dateColIndex !== -1) {
    const dates = data.map(r => r[dateColIndex]).filter(Boolean).sort();
    html += `<strong>Date range:</strong> ${dates[0]} → ${dates[dates.length - 1]}`;
  } else {
    html += "No date column found";
  }

  statsDiv.style.display = "block";
  statsDiv.innerHTML = html;
  section2.classList.remove("locked");
}

/* =========================
   SECTION 2 – VARIABLES
========================= */

variableSelect.onchange = () => {
  const value = variableSelect.value;
  if (!value) return;

  selectedVariables.push(value);
  availableVariables = availableVariables.filter(v => v !== value);

  renderVariableSelect();
  renderVariables();
};

function renderVariableSelect() {
  variableSelect.innerHTML = '<option value="">-- select variable --</option>';

  availableVariables.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    variableSelect.appendChild(opt);
  });
}

function renderVariables() {
  selectedVariablesDiv.innerHTML = "";

  selectedVariables.forEach((v, index) => {
    const div = document.createElement("div");
    div.className = "variable-item";
    div.textContent = v;
    div.draggable = true;

    div.ondragstart = () => {
      div.classList.add("dragging");
      div.dataset.index = index;
    };

    div.ondragend = () => div.classList.remove("dragging");
    div.ondragover = (e) => e.preventDefault();

    div.ondrop = () => {
      const from = Number(document.querySelector(".dragging").dataset.index);
      const to = index;
      const item = selectedVariables.splice(from, 1)[0];
      selectedVariables.splice(to, 0, item);
      renderVariables();
    };

    selectedVariablesDiv.appendChild(div);
  });
}

/* =========================
   FETCH VARIABLE CATALOG
========================= */

fetch("/get_var_catalog")
  .then(res => res.json())
  .then(data => {
    availableVariables = data;
    renderVariableSelect();
  })
  .catch(() => {
    variableSelect.innerHTML = '<option value="">Failed to load variables</option>';
  });

/* =========================
   SECTION 3 
========================= */

enrichBtn.addEventListener("click", () => {
  if (!selectedVariables.length) return;

  // Unlock Section 3
  document.getElementById("section3").classList.remove("locked");

  // Clear previous progress
  progressContainer.innerHTML = "";

  // Create progress rows
  progressState = selectedVariables.map(v => {
    const row = document.createElement("div");
    row.className = "progress-row";

    const label = document.createElement("div");
    label.className = "progress-label";
    label.innerHTML = `<span>${v}</span><span class="status">Pending</span>`;

    const bar = document.createElement("div");
    bar.className = "progress-bar";

    const fill = document.createElement("div");
    fill.className = "progress-fill";

    bar.appendChild(fill);
    row.appendChild(label);
    row.appendChild(bar);
    progressContainer.appendChild(row);

    return { fill, status: label.querySelector(".status") };
  });

  let current = 0;

  function runNext() {
    if (current >= progressState.length) return;

    const item = progressState[current];
    item.status.textContent = "Processing";

    let progress = 0;

    const interval = setInterval(() => {
      progress += 5; 
      if (progress > 100) progress = 100;
      item.fill.style.width = progress + "%";

      if (progress >= 100) {
        clearInterval(interval);       
        item.status.textContent = "Finished";
        unlockSection4IfReady();       

        current++;                       
        setTimeout(runNext, 200);         
      }
    }, 120); 
  }

  runNext(); 
});

/* =========================
   SECTION 4
========================= */
function unlockSection4IfReady() {
    if (!progressState.length) return;

    const allFinished = progressState.every(
        p => p.status.textContent === "Finished"
    );

    if (allFinished) {
        document.getElementById("section4").classList.remove("locked");
        document.getElementById("exportCsvBtn").disabled = false;
        document.getElementById("exportJsonBtn").disabled = false;
    }
}
