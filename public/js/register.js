const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showToast("Passwords do not match!", "error");
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      showToast("Registration Successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } else {
      showToast(data.message, "error");
    }
  } catch (error) {
    showToast("Server connection error", "error");
  }
});
