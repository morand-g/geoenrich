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

const variableSelect = document.getElementById("variableSelect");
const selectedVariablesDiv = document.getElementById("selectedVariables");
const selectedVariablesList = document.getElementById("selectedVariablesList");

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


// Process the selected or uploaded CSV file
startBtn.addEventListener("click", (e) => {

  // If a previous file is selected, let form submit normally
  if (previousFileSelect.value) {
    return;
  }

  // Otherwise process uploaded file
  if (!csvFile) return;

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

// Initialize the page by fetching previous files
fetchPreviousFiles();

document.getElementById('datasetform').addEventListener('submit', async (e) => {
  e.preventDefault(); // Prevent page reload

  const formData = new FormData(e.target);

  // Send to backend
  await fetch('/uploadFile', {
    method: 'POST',
    body: formData
  });

  // Now handle frontend logic depending on file type

  if (previousFileSelect.value) {
    // Fetch file content from server
    const response = await fetch(`/getFileContent/${previousFileSelect.value}`);
    const text = await response.text();
    processCSV(text);
  } else if (csvFile) {
    // Use uploaded file
    const reader = new FileReader();
    reader.onload = () => processCSV(reader.result);
    reader.readAsText(csvFile);
  }
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
      // Remove the variable from the array
      selectedVariables.splice(index, 1);
      // Update the selected variables list
      selectedVariablesList.value = selectedVariables.join(',');
      // Re-render the variables
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

exportBtn.addEventListener("click", () => {
    fetch("/preview_csv")
        .then(response => response.json())
        .then(data => {
            generateTable(data);
            modal.style.display = "flex";
        });
});

closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

downloadBtn.addEventListener("click", () => {
    window.location.href = "/download_csv";
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