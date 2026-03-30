const alertBox = document.getElementById("alert");
const loginBtn = document.getElementById("loginBtn");

function setAlert(msg, tone) {
  if (!msg) {
    alertBox.style.display = "none";
    alertBox.textContent = "";
    alertBox.classList.remove("ok", "err");
    return;
  }
  alertBox.textContent = msg;
  alertBox.style.display = "block";
  alertBox.classList.remove("ok", "err");
  if (tone) alertBox.classList.add(tone);
}

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  setAlert("");

  if (!email || !password) {
    setAlert("Please enter both email and password.", "err");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setAlert(data.msg || "Login failed.", "err");
      return;
    }
    setAlert("Logged in. Redirecting to /admin ...", "ok");
    setTimeout(() => { window.location.href = "/admin"; }, 800);
  } catch (err) {
    setAlert("Network error. Please try again.", "err");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});
