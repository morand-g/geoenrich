const style = document.createElement("style");
style.textContent = `
.progress-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.top-row {
  display: flex;
  align-items: center;
}

.progress-label {
  flex: 1;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 16px;
}
`;
document.head.appendChild(style);

socket.on("enrichment_status", (data) => {

  if (data.status === "PENDING") {

    document.getElementById("section3").classList.remove("locked");
    document.getElementById("progressContainer").querySelector('.muted').style.display = "none";

    const row = document.createElement("div");
    row.className = "progress-row";

    const label = document.createElement("div");
    label.className = "progress-label";
    label.innerHTML = `<span>${data.varname}</span>`;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";

    removeBtn.onclick = () => {
      row.remove();
      fetch('/delete/' + data.enrichment_id);
      unlockSection4IfReady();
    };

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
    
    const topRow = document.createElement("div");
    topRow.className = "top-row";
    topRow.appendChild(label);
    topRow.appendChild(removeBtn);

    row.appendChild(topRow);
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


socket.on("collation_status", (data) => {

  document.getElementById("section2").classList.add("locked");

  const collateBtn = document.getElementById("collateBtn");
  const fill = collateBtn.querySelector(".fill");
  const label = collateBtn.querySelector(".label");

  if (data.status === "PROGRESS") {

    document.getElementById("section2").classList.add("locked");
    document.getElementById("section3").classList.add("locked");
    collateBtn.style.background = "#d1d5db";
    fill.style.width = data.progress + "%";
    label.textContent = `Collating... (${data.progress}%)`;
  }
  else if (data.status === "COMPLETED") {

    fill.style.width = "100%";
    label.textContent = "Collation complete. Restart?";
    collateBtn.disabled = false;
    normalizeBtn.disabled = false;

    document.getElementById("section2").classList.remove("locked");
    document.getElementById("section3").classList.remove("locked");
    }

});


socket.on("normalization_status", (data) => {

  const normalizeBtn = document.getElementById("normalizeBtn");
  const collateBtn = document.getElementById("collateBtn");
  const fill = normalizeBtn.querySelector(".fill");
  const label = normalizeBtn.querySelector(".label");

  if (data.status === "PROCESSING") {
    collateBtn.disabled = true;
    fill.style.background = "#85cc9f";
    normalizeBtn.style.background = "#d1d5db";
    fill.style.width = data.progress + "%";
    if (data.subsample) {
      label.innerHTML = `Calculating normalization values... (${data.progress}%)<br />(Using a random subsample)`;
    } else {
      label.innerHTML = `Calculating normalization values... (${data.progress}%)`;
    }
  }

  else if (data.status === "PROGRESS") {
    fill.style.background = "#22c55e";
    normalizeBtn.style.background = "#d1d5db";
    fill.style.width = data.progress + "%";
    label.textContent = `Normalizing... (${data.progress}%)`;
  }

  else if (data.status === "COMPLETED") {
    fill.style.width = "100%";
    label.textContent = "Normalization complete. Restart?";
    collateBtn.disabled = false;
    normalizeBtn.disabled = false;
    }

});



socket.on("csvexport_status", (data) => {

  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const fill = exportCsvBtn.querySelector(".fill");
  const label = exportCsvBtn.querySelector(".label");

  if (data.status === "PROGRESS") {
    exportCsvBtn.disabled = true;
    fill.style.background = "#22c55e";
    exportCsvBtn.style.background = "#d1d5db";
    fill.style.width = parseInt(fill.style.width) + parseInt(data.progress) + "%";
    label.textContent = `Processing variables... (${fill.style.width })`;
  }

  else if (data.status === "COMPLETED") {
    fill.style.width = "100%";
    label.textContent = "CSV export complete. Restart?";
    exportCsvBtn.disabled = false;
    
    fetch("/get_csv_export_preview/<task_id>".replace("<task_id>", csvexportTaskId))
        .then(response => response.json())
        .then(data => {
            generateTable(data);
            modal.style.display = "flex";
        });

    }

});


