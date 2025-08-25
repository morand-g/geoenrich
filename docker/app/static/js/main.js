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