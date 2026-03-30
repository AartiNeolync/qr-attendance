const router = require("express").Router();
const Attendance = require("../Models/Attendance");
const { auth, role } = require("../middleware/auth");

// Admin Dashboard
router.get("/stats", auth, role("admin", "manager"), async (req, res) => {
  const total = await Attendance.countDocuments();
  const today = new Date().toISOString().slice(0, 10);

  const todayCount = await Attendance.countDocuments({ date: today });
  const present = await Attendance.countDocuments({ status: "present" });

  res.json({
    total,
    todayCount,
    present
  });
});

module.exports = router;