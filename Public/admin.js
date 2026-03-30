const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statPresent = document.getElementById("statPresent");
const statAdmins = document.getElementById("statAdmins");
const statManagers = document.getElementById("statManagers");
const statEmployees = document.getElementById("statEmployees");
const attendanceBody = document.querySelector("#attendanceTable tbody");
const usersBody = document.querySelector("#usersTable tbody");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

function formatTime(value) {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "-" : date.toLocaleTimeString();
}

async function loadStats() {
  const res = await fetch("/dashboard/stats");
  if (!res.ok) throw new Error("Stats failed");
  const data = await res.json();
  statTotal.textContent = data.total ?? "-";
  statToday.textContent = data.todayCount ?? "-";
  statPresent.textContent = data.present ?? "-";
}

async function loadAttendance() {
  const res = await fetch("/attendance");
  if (!res.ok) throw new Error("Attendance failed");
  const data = await res.json();
  attendanceBody.innerHTML = "";
  const rows = Array.isArray(data) ? data.slice(-10).reverse() : [];
  rows.forEach((row) => {
    const user = row.userId || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email || "-"}</td>
      <td>${row.date || "-"}</td>
      <td>${formatTime(row.time)}</td>
    `;
    attendanceBody.appendChild(tr);
  });
}

async function loadUsers() {
  const res = await fetch("/users/all");
  if (!res.ok) throw new Error("Users failed");
  const data = await res.json();
  usersBody.innerHTML = "";
  const rows = Array.isArray(data) ? data : [];
  const counts = { admin: 0, manager: 0, employee: 0 };
  rows.forEach((user) => {
    const role = user.role || "employee";
    if (counts[role] !== undefined) counts[role] += 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email || "-"}</td>
      <td><span class="badge bg-${role === "admin" ? "danger" : role === "manager" ? "info" : "secondary"}">${role}</span></td>
    `;
    usersBody.appendChild(tr);
  });
  statAdmins.textContent = counts.admin;
  statManagers.textContent = counts.manager;
  statEmployees.textContent = counts.employee;
}

async function refreshAll() {
  try {
    await Promise.all([loadStats(), loadAttendance(), loadUsers()]);
  } catch (err) {
    console.error(err);
  }
}

refreshBtn.addEventListener("click", refreshAll);
logoutBtn.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/login";
});

refreshAll();
