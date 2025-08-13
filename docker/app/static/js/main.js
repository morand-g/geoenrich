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