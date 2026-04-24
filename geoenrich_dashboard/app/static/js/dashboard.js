const section1 = document.getElementById("section1");
const uploadBox = document.getElementById("uploadBox");
const uploadBox2 = document.getElementById("uploadBox2");
const uploadText = document.getElementById("uploadText");
const uploadText2 = document.getElementById("uploadText2");
const fileInput = document.getElementById("fileInput");
const fileInput2 = document.getElementById("fileInput2");
const startBtn = document.getElementById("startBtn");
const normalizeBtn = document.getElementById("normalizeBtn");
const collateBtn = document.getElementById("collateBtn");
const statsDiv = document.getElementById("stats");
const section2 = document.getElementById("section2");
const enrichBtn = document.getElementById("enrichBtn");
const progressContainer = document.getElementById("progressContainer");
const resInput = document.getElementById("resInput");

const variableSelect = document.getElementById("variableSelect");
const selectedVariablesDiv = document.getElementById("selectedVariables");
const selectedVariablesList = document.getElementById("selectedVariablesList");

const datasetForm = document.getElementById("datasetform");

let csvFile = null;
let selectedVariables = [];
let availableVariables = [];

/* =========================
   SECTION 1 – CSV UPLOAD
========================= */


const previousFileSelect = document.getElementById('previousFileSelect');

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

// Fetch and populate the dropdown with previous session files
async function fetchPreviousFiles() {
  const response = await fetch('/getPreviousFiles');
  const files = await response.json();
  if (files.length > 0) {
    previousFileSelect.hidden = false;
    files.forEach(file => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file;
      previousFileSelect.appendChild(option);
    });
  }
}

// Use selected previous file if present
previousFileSelect.addEventListener('change', () => {
  if (previousFileSelect.value) {
    uploadText.textContent = previousFileSelect.value;
    startBtn.disabled = false;
  }
});


// Initialize the page by fetching previous files
fetchPreviousFiles();


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
}


datasetForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    let fileText = "";

    if (!previousFileSelect.value) {

        const reader = new FileReader();
        fileText = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(fileInput.files[0]);
        });

        // Validate headers
        const firstLine = fileText.split("\n")[0];
        const delimiter = firstLine.includes(";") ? ";" : ",";
        const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());

        if (!validateCSVHeaders(headers)) {
            showFormatModal();
            return;
        }

        processCSV(fileText);
    
    }

    const formData = new FormData(datasetForm);
    await fetch('/uploadFile', { method: 'POST', body: formData });
    section1.classList.add("locked");
    section2.classList.remove("locked");
    
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

    // Create a delete button (X)
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.className = "delete-btn";

    // Add event listener to delete button
    deleteBtn.onclick = () => {
      const removed = selectedVariables.splice(index, 1)[0];

      // Add it back to available variables
      availableVariables.push(removed);

      // Optional: keep list sorted
      availableVariables.sort();

      selectedVariablesList.value = selectedVariables.join(',');

      renderVariableSelect(); // 🔥 important
      renderVariables();
    };

    // Append the delete button to the div
    div.appendChild(deleteBtn);

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
        selectedVariables = [];
        selectedVariablesList.value = '';
        renderVariables();
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






/* =========================
   SECTION 4
========================= */

//collate button
function isValidInteger(value) {
  return value !== "" && Number.isInteger(Number(value));
}

function updateCollateButton() {
  const statuses = document.querySelectorAll(".status");
  const allFinished = [...statuses].every(s => s.textContent.trim() === "Finished");

  if (allFinished && isValidInteger(resInput.value)) {
    collateBtn.disabled = false;
  } else {
    collateBtn.disabled = true;
  }
}

resInput.addEventListener("input", updateCollateButton);

function unlockSection4IfReady() {

  const statuses = document.querySelectorAll(".status");

  if (!statuses) return;

  const allFinished = [...statuses].every(s => s.textContent.trim() === "Finished");;

  if (allFinished) {
      document.getElementById("section4").classList.remove("locked");
      document.getElementById("collateBtn").disabled = false;
      document.getElementById("section4").querySelector('.muted').style.display = "none";
      fetch("/checkExported");
  }
  else {
      document.getElementById("section4").classList.add("locked");
      document.getElementById("collateBtn").disabled = true;
      document.getElementById("section4").querySelector('.muted').style.display = "block";
  }
  updateCollateButton();
}

document.getElementById('collateForm').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        const response = await fetch('/collateData', {
            method: 'POST',
            body: new FormData(e.target)
        });
        collateBtn.disabled = true;
    });



uploadBox2.addEventListener("click", () => fileInput2.click());

uploadBox2.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadBox2.classList.add("dragover");
});

uploadBox2.addEventListener("dragleave", () => {
  uploadBox2.classList.remove("dragover");
});

uploadBox2.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadBox2.classList.remove("dragover");
  handleFile2(e.dataTransfer.files[0]);
});

fileInput2.addEventListener("change", () => {
  handleFile2(fileInput2.files[0]);
});

function handleFile2(file) {
  if (!file || !file.name.endsWith(".npy")) return;
  npyFile = file;
  uploadText2.textContent = file.name;
  normalizeBtn.disabled = false;
}

document.getElementById('normform').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        const response = await fetch('/normalizeData', {
            method: 'POST',
            body: new FormData(e.target)
        });
        normalizeBtn.disabled = true;
    });

//modal Js
const exportBtn = document.getElementById("exportCsvBtn");
const modal = document.getElementById("csvModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const downloadBtn = document.getElementById("downloadCsvBtn");
const previewTable = document.getElementById("csvPreviewTable");
let csvexportTaskId = null;

exportBtn.addEventListener("click", () => {
    fetch("/prepare_csv_export")
        .then(response => response.json())
        .then(data => {
            csvexportTaskId = data.task_id;
        });
});

closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

downloadBtn.addEventListener("click", () => {
    window.location.href = "/get_csv_export/<task_id>".replace("<task_id>", csvexportTaskId);
});

function generateTable(data) {
    previewTable.innerHTML = "";

    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    previewTable.appendChild(thead);

    const tbody = document.createElement("tbody");

    data.forEach(row => {
        const tr = document.createElement("tr");
        headers.forEach(header => {
            const td = document.createElement("td");
            td.textContent = row[header];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    previewTable.appendChild(tbody);
}


//popup//
function validateCSVHeaders(cols) {
  const hasId = cols.includes("id");

  const latOptions = ["latitude", "lat", "decimallatitude", "y"];
  const lonOptions = ["longitude", "lon", "decimallongitude", "x"];
  const dateOptions = ["date", "eventdate"];

  const hasLat = latOptions.some(opt => cols.includes(opt));
  const hasLon = lonOptions.some(opt => cols.includes(opt));
  const hasDate = dateOptions.some(opt => cols.includes(opt));

  const case1Valid = hasId && hasLat && hasLon && hasDate;

  const case2Required = [
    "id",
    "latitude_min",
    "latitude_max",
    "longitude_min",
    "longitude_max",
    "date_min",
    "date_max"
  ];

  const case2Valid = case2Required.every(req => cols.includes(req));

  return case1Valid || case2Valid;
}



function showFormatModal() {
  document.getElementById("formatErrorModal").style.display = "flex";
}

document.getElementById("closeFormatErrorModal").addEventListener("click", () => {
  document.getElementById("formatErrorModal").style.display = "none";
});
