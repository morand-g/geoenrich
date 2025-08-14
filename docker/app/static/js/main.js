(function () {
  const fileInput   = document.getElementById('fileselect');
  const uploadText  = document.getElementById('uploadText');
  const uploadBox   = document.getElementById('uploadBox');
  const defaultText = uploadText.textContent.trim();
  const placeholderColor = '#999'; // or whatever your placeholder color is

  // Set initial color
  uploadText.style.color = placeholderColor;

  fileInput.addEventListener('change', function () {
    if (this.files && this.files.length > 0) {
      const names = Array.from(this.files).map(f => f.name);
      const label = names.join(', ');
      uploadText.textContent = label;
      uploadText.title = label;
      uploadBox.classList.add('has-file');
      uploadText.style.color = 'white'; // file selected → white
    } else {
      uploadText.textContent = defaultText;
      uploadText.title = '';
      uploadBox.classList.remove('has-file');
      uploadText.style.color = placeholderColor; // revert to gray
    }
  });
})();

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
  