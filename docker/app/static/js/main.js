//drag and drop logic
(function () {
  const fileInput   = document.getElementById('fileselect');
  const uploadText  = document.getElementById('uploadText');
  const uploadBox   = document.getElementById('uploadBox');
  const fileError   = document.getElementById('fileError');
  const defaultText = uploadText.textContent.trim();
  const placeholderColor = '#999'; // your placeholder color
  const maxSize = 20 * 1024 * 1024; // 20 MB

  // Set initial color
  uploadText.style.color = placeholderColor;
  fileError.style.display = 'none';

  fileInput.addEventListener('change', function () {
    if (this.files && this.files.length > 0) {
      const file = this.files[0];
      if (file.size <= maxSize) {
        // File is within limit
        uploadText.textContent = file.name;
        uploadText.title = file.name;
        uploadBox.classList.add('has-file');
        uploadText.style.color = 'white';
        fileError.style.display = 'none';
      } else {
        // File too big
        fileError.style.display = 'block';
        this.value = ''; // reset input
        uploadText.textContent = defaultText;
        uploadText.title = '';
        uploadBox.classList.remove('has-file');
        uploadText.style.color = placeholderColor;
      }
    } else {
      // No file selected
      uploadText.textContent = defaultText;
      uploadText.title = '';
      uploadBox.classList.remove('has-file');
      uploadText.style.color = placeholderColor;
      fileError.style.display = 'none';
    }
  });
})();


//variable selection
 document.addEventListener('DOMContentLoaded', function () {
    const element = document.getElementById('var_id');
    const choices = new Choices(element, {
      searchEnabled: true,
      placeholder: true,
      // placeholderValue: 'Click to choose',
      searchPlaceholderValue: 'Search...',
      shouldSort: false,
      
    });
  });

  //attributes check and grey
document.querySelector("form").addEventListener("submit", function(e) {
    let fileInput = document.getElementById('fileselect');
    let varSelect = document.getElementById('var_id');
    let errorDiv = document.getElementById('error-message');

    let errors = [];
    if (!fileInput.value) {
        errors.push("Please upload your occurrences file");
    }
    if (!varSelect.value) {
        errors.push("Please choose a variable");
    }

    if (errors.length > 0) {
        e.preventDefault(); // Stop form submission
        errorDiv.innerHTML = errors.join("<br>");
        errorDiv.style.display = "block";
        document.getElementById("loading-overlay").style.display = "none"; // ensure spinner stays hidden
    } else {
        errorDiv.style.display = "none";
        document.getElementById("loading-overlay").style.display = "flex"; // start spinner only when valid
    }
});

// Load catalog.csv and labels.json, then populate dropdown
Promise.all([
  fetch("/static/js/catalog.csv").then(r => r.text()),
  fetch("/static/js/labels.json").then(r => r.json())
])
.then(([csvText, labelMap]) => {
  const rows = csvText
    .trim()
    .split("\n")
    .map(r => r.replace(/\r/g, "").split(",").map(v => v.trim()))
    .filter(r => r.length > 1);

  const headers = rows[0];
  const variableIndex = headers.indexOf("variable");
  const urlIndex = headers.indexOf("url");

  const menu = document.getElementById("dropdownMenu");
  const toggle = document.querySelector(".dropdown-toggle");
  const hiddenInput = document.getElementById("var_id");

  rows.slice(1).forEach(row => {
    const variable = row[variableIndex];
    const displayLabel = labelMap[variable] || variable;
    const url = `https://data.marine.copernicus.eu/products?q=${row[urlIndex]}`;

    const item = document.createElement("div");
    item.classList.add("dropdown-item");
    item.innerHTML = `
      <span>${displayLabel}</span>
      ${url ? `<a href="${url}" target="_blank">source</a>` : ""}
    `;

    item.addEventListener("click", (e) => {
      if (e.target.tagName !== "A") {
        toggle.textContent = displayLabel;
        hiddenInput.value = variable;
        menu.style.display = "none";
      }
    });

    menu.appendChild(item);
  });

  toggle.addEventListener("click", () => {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) menu.style.display = "none";
  });
})
.catch(err => console.error("Error loading files:", err));