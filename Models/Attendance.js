const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: String,
    time: Date
});

module.exports = mongoose.model("attendance", attendanceSchema);