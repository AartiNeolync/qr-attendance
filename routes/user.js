const router = require("express").Router();
const User = require("../Models/User");
const { auth, role } = require("../middleware/auth");

// Only admin can see all users
router.get("/all", auth, role("admin"), async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;