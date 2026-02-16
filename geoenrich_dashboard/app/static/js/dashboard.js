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
const selectedVariablesList = document.getElementById("selectedVariablesList");


// const socket = io();

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

document.getElementById('datasetform').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        const response = await fetch('/uploadFile', {
            method: 'POST',
            body: new FormData(e.target)
        });
        document.getElementById("section1").classList.add("locked");
    });

/* =========================
   SECTION 2 – VARIABLES
========================= */

variableSelect.onchange = () => {
  const value = variableSelect.value;
  if (!value) return;

  selectedVariables.push(value);
  selectedVariablesList.value = selectedVariablesList.value + ',' + value;
  availableVariables = availableVariables.filter(v => v !== value);

  renderVariableSelect();
  renderVariables();
  enrichBtn.disabled = false;
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

document.getElementById('varform').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        const response = await fetch('/addVariables', {
            method: 'POST',
            body: new FormData(e.target)
        });
    });

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



socket.on("enrichment_status", (data) => {

  document.getElementById("section3").classList.remove("locked");

  if (data.enrichment_id === "collation") {
    document.getElementById("section2").classList.add("locked");
    document.getElementById("section3").classList.add("locked");

    const collateBtn = document.getElementById("collateBtn");
      const fill = collateBtn.querySelector(".fill");
      const label = collateBtn.querySelector(".label");

    if (data.status === "PROGRESS") {

      collateBtn.style.background = "#d1d5db";
      fill.style.width = data.progress + "%";
      label.textContent = `Collating... (${data.progress}%)`;
    }
    else if (data.status === "COMPLETED") {

      fill.style.width = "100%";
      label.textContent = "Collation complete";
      collateBtn.disabled = true;
      normalizeBtn.disabled = false;
    }

  }

  else if (data.status === "PENDING") {

    document.getElementById("progressContainer").querySelector('.muted').style.display = "none";

    const row = document.createElement("div");
    row.className = "progress-row";

    const label = document.createElement("div");
    label.className = "progress-label";
    label.innerHTML = `<span>${data.varname}</span>`;


    const button = document.createElement("button");
    button.className = "inputfillbutton";
    button.type = "button";
    button.value = "Start";
    button.id = 'start_' + data.enrichment_id;

    const fill = document.createElement("div");
    fill.className = "fill";
    fill.id = "fill_" + data.enrichment_id;

    button.onclick = () => {
      button.style.background = "#d1d5db";
      fill.style.background = "#22c55e";
      fill.style.width = "0%";
      fetch('/enrich/' + data.enrichment_id);
    };

    const buttonlabel = document.createElement("span");
    buttonlabel.textContent = "Start";
    buttonlabel.className = "label status";
    buttonlabel.id = "status_" + data.enrichment_id;

    button.appendChild(fill);
    button.appendChild(buttonlabel);
    
    row.appendChild(label);
    row.appendChild(button);
    progressContainer.appendChild(row);

    unlockSection4IfReady();
  }

  else if (data.status === "STARTING") {
    const status = document.getElementById("status_" + data.enrichment_id);
    status.textContent = "Starting...";
    const button = document.getElementById('start_' + data.enrichment_id);
    button.disabled = true;
  }

  else if (data.status === "PROGRESS") {
    const fill = document.getElementById("fill_" + data.enrichment_id);
    const status = document.getElementById("status_" + data.enrichment_id);
    fill.style.width = data.progress + "%";
    status.textContent = `In Progress (${data.progress}%)`;
  }

  else if (data.status === "COMPLETED") {
    const fill = document.getElementById("fill_" + data.enrichment_id);
    const status = document.getElementById("status_" + data.enrichment_id);
    fill.style.width = "100%";
    status.textContent = "Finished";
    const button = document.getElementById('start_' + data.enrichment_id);
    button.disabled = true;

    unlockSection4IfReady();
  }

  else if (data.status === "ERROR") {
    const status = document.getElementById("status_" + data.enrichment_id);
    status.textContent = 'Error. Retry?';
    status.title = data.error;

    const fill = document.getElementById("fill_" + data.enrichment_id);
    fill.style.background = "#ef4444";
    fill.style.width = "100%";

    const button = document.getElementById('start_' + data.enrichment_id);
    button.disabled = false;

  }

  else {
    console.log("Unknown status:", data);
  }
});






/* =========================
   SECTION 4
========================= */
function unlockSection4IfReady() {

  const statuses = document.querySelectorAll(".status");

  if (!statuses) return;

  const allFinished = [...statuses].every(s => s.textContent.trim() === "Finished");;

  if (allFinished) {
      document.getElementById("section4").classList.remove("locked");
      document.getElementById("collateBtn").disabled = false;
      document.getElementById("section4").querySelector('.muted').style.display = "none";
  }
  else {
      document.getElementById("section4").classList.add("locked");
      document.getElementById("collateBtn").disabled = true;
      document.getElementById("section4").querySelector('.muted').style.display = "block";
  }
}

document.getElementById('collateForm').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        const response = await fetch('/collateData', {
            method: 'POST',
            body: new FormData(e.target)
        });
    });