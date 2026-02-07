// មុខងារបង្ហាញសារ
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = ""; // លុប class ចាស់
  toast.classList.add("show", type); // ដាក់ class ថ្មី

  // បាត់ទៅវិញក្រោយ 3 វិនាទី
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
