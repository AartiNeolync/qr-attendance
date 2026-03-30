const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" },
    resetToken: String,
    resetTokenExp: Date
});

module.exports = mongoose.model("User", userSchema);
