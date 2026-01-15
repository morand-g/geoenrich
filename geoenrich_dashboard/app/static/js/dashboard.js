// ===============================
// MULTI-VARIABLE SELECTION (FETCH)
// ===============================
document.addEventListener("DOMContentLoaded", function () {

  console.log("DOM READY – FETCH VARIABLES INIT");

  const availableEl = document.getElementById("availableVariables");
  const selectedEl  = document.getElementById("selectedVariables");
  const hiddenInput = document.getElementById("var_id");

  if (!availableEl || !selectedEl || !hiddenInput) {
    console.error("Variable containers not found in DOM");
    return;
  }

  let selectedVars = [];
  let catalog = [];

  // ---------- LOAD CATALOG ----------
  Promise.all([
    fetch("/static/js/catalog.csv").then(r => r.text()),
    fetch("/static/js/labels.json").then(r => r.json())
  ])
  .then(([csvText, labelMap]) => {

    const rows = csvText
      .trim()
      .split("\n")
      .map(r => r.replace(/\r/g, "").split(",").map(v => v.trim()));

    const headers = rows[0];
    const variableIndex = headers.indexOf("variable");
    const urlIndex = headers.indexOf("url");

    catalog = rows.slice(1).map(r => ({
      id: r[variableIndex],
      label: labelMap[r[variableIndex]] || r[variableIndex],
      url: r[urlIndex]
        ? `https://data.marine.copernicus.eu/products?q=${r[urlIndex]}`
        : null
    }));

    renderAvailable();
  })
  .catch(err => console.error("Error loading catalog:", err));

  // ---------- RENDER FUNCTIONS ----------
  function renderAvailable() {
    availableEl.innerHTML = "";

    catalog.forEach(v => {
      if (!selectedVars.find(s => s.id === v.id)) {
        const div = document.createElement("div");
        div.className = "dropdown-item";
        div.innerHTML = `
          <span>${v.label}</span>
          ${v.url ? `<a href="${v.url}" target="_blank">source</a>` : ""}
        `;

        div.addEventListener("click", e => {
          if (e.target.tagName !== "A") addVariable(v);
        });

        availableEl.appendChild(div);
      }
    });
  }

  function renderSelected() {
    selectedEl.innerHTML = "";

    selectedVars.forEach(v => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.dataset.id = v.id;
      div.textContent = v.label;
      div.title = "Click to remove – Drag to reorder";

      div.addEventListener("click", () => removeVariable(v.id));

      selectedEl.appendChild(div);
    });
  }

  // ---------- ACTIONS ----------
  function addVariable(v) {
    selectedVars.unshift(v); // climb to top
    renderAvailable();
    renderSelected();
    syncHiddenInput();
  }

  function removeVariable(id) {
    selectedVars = selectedVars.filter(v => v.id !== id);
    renderAvailable();
    renderSelected();
    syncHiddenInput();
  }

  function syncHiddenInput() {
    hiddenInput.value = selectedVars.map(v => v.id).join(",");
  }

  // ---------- DRAG & DROP ----------
  new Sortable(selectedEl, {
    animation: 150,
    onEnd: () => {
      const reordered = [];
      selectedEl.querySelectorAll(".dropdown-item").forEach(el => {
        const v = selectedVars.find(v => v.id === el.dataset.id);
        reordered.push(v);
      });
      selectedVars = reordered;
      syncHiddenInput();
    }
  });

});

// ===============================
// DROPDOWN OPEN / CLOSE
// ===============================
// ===============================
// DROPDOWN OPEN / CLOSE (CSS-COMPATIBLE)
// ===============================
document.addEventListener("click", function (e) {

  const toggle = e.target.closest(".dropdown-toggle");
  const dropdowns = document.querySelectorAll(".dropdown");

  // close all dropdowns
  dropdowns.forEach(d => {
    const menu = d.querySelector(".dropdown-menu");
    if (menu) menu.style.display = "none";
  });

  if (toggle) {
    const dropdown = toggle.closest(".dropdown");
    const menu = dropdown.querySelector(".dropdown-menu");

    // toggle current dropdown
    menu.style.display = menu.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  }
});

// prevent closing when clicking inside menu
document.querySelectorAll(".dropdown-menu").forEach(menu => {
  menu.addEventListener("click", e => e.stopPropagation());
});


function initProgressBars() {
  const raw = document.getElementById("var_id").value;
  if (!raw) return;

  const variables = raw.split(",").map(v => v.trim());
  const container = document.getElementById("progress-container");
  const section = document.getElementById("processing-section");

  container.innerHTML = "";
  section.style.display = "block";

  variables.forEach(v => {
    const row = document.createElement("div");
    row.className = "progress-row";
    row.dataset.var = v;

    row.innerHTML = `
      <div>${v}</div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar"></div>
      </div>
      <div class="progress-status">Waiting</div>
    `;

    container.appendChild(row);
  });
}


// async function processVariablesSequentially(jobId) {
//   const rows = document.querySelectorAll(".progress-row");

//   for (const row of rows) {
//     const variable = row.dataset.var;
//     const bar = row.querySelector(".progress-bar");
//     const status = row.querySelector(".progress-status");

//     status.textContent = "Processing";

//     await processSingleVariable(jobId, variable, bar, status);

//     status.textContent = "Done";
//     bar.style.width = "100%";
//   }
// }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFakeProcessing() {
  const rows = document.querySelectorAll(".progress-row");

  for (const row of rows) {
    const bar = row.querySelector(".progress-bar");
    const status = row.querySelector(".progress-status");

    status.textContent = "Processing";

    let progress = 0;

    while (progress < 100) {
      progress += Math.random() * 12;   // natural-looking increments
      progress = Math.min(progress, 100);
      bar.style.width = progress + "%";

      await sleep(300 + Math.random() * 300);
    }

    status.textContent = "Done";
    await sleep(400);
  }
}

document.getElementById("continueBtn").addEventListener("click", () => {
  initProgressBars();
  runFakeProcessing();
});