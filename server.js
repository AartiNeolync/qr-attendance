const User = require("./Models/User");
const Attendance = require("./Models/Attendance");
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const { auth, role } = require("./middleware/auth");
const userRoutes = require("./routes/user");
const bcrypt = require("bcryptjs");

const app = express();
// Only trust the first proxy hop (safe default for local/dev; adjust if behind a proxy).
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(express.json());
app.use(express.static("Public")); // serve HTML files
// Allow inline scripts in our HTML pages (login/index use inline <script>).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "http://localhost:3000" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_session_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 50
}));

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/attendance")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const QRCode = require("qrcode");

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", userRoutes);

// Register API
app.post("/register", async (req, res) => {
    const { name, email } = req.body;

    // ✅ Save user in DB
    const user = new User({ name, email });
    await user.save();

    // ✅ Generate QR using ONLY userId
    const qrData = user._id.toString();

    const qrImage = await QRCode.toDataURL(qrData);

    res.json({ qrImage, user });
});
app.post("/scan", async (req, res) => {

    const rawIP =
        req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        "";

    const userIP = rawIP.replace("::ffff:", "");
    console.log("User IP:", userIP, "XFF:", req.headers["x-forwarded-for"]);

    // ✅ Allow only office network (adjust as needed)
    const allowedOfficeIPs = ["192.168.73.53"];
    const isLocalhost = ["127.0.0.1", "::1"].includes(userIP);
    const inOfficeSubnet =
        userIP.startsWith("192.168.72.") ||
        userIP.startsWith("192.168.73.") ||
        userIP.startsWith("192.168.74.") ||
        userIP.startsWith("192.168.75.");
    const isPrivateIPv4 =
        userIP.startsWith("10.") ||
        userIP.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(userIP);

    const isAllowed =
        isLocalhost ||
        allowedOfficeIPs.includes(userIP) ||
        inOfficeSubnet ||
        isPrivateIPv4;

    if (!isAllowed) {
        return res.json({
            message: "Attendance allowed only in office network",
            debug: { userIP }
        });
    }

    const { userId } = req.body;

    const today = new Date().toDateString();

    const exists = await Attendance.findOne({
        userId,
        date: today
    });

    if (exists) {
        return res.json({ message: "Attendance already marked today" });
    }

    const attendance = new Attendance({
        userId,
        date: today,
        time: new Date()
    });

    await attendance.save();

    io.emit("attendanceUpdate", { userId });
    res.json({ message: "Attendance marked successfully" });
});
// Test route (optional)
app.get("/", (req, res) => {
    res.send("Server is working");
});

app.get("/attendance", async (req, res) => {
    try {
        const data = await Attendance.find().populate("userId");
        res.json(data);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching attendance");
    }
});

app.get("/attendance-page", (req, res) => {
    res.sendFile(path.join(__dirname, "Public", "attendance.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "Public", "login.html"));
});

// One-time admin setup (dev only). Creates admin if not exists.
app.get("/setup-admin", async (req, res) => {
    try {
        const email = process.env.ADMIN_EMAIL || "aartipise2512@gmail.com";
        const password = process.env.ADMIN_PASSWORD || "pass123";

        const existing = await User.findOne({ email });
        if (existing) {
            return res.json({ message: "Admin already exists", email });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: "Admin",
            email,
            password: hash,
            role: "admin"
        });

        res.json({
            message: "Admin created  Neolync",
            email: user.email,
            password
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create admin" });
    }
});

io.on("connection", (socket) => {
  console.log("User connected");
});

server.listen(3000);

app.get("/admin", auth, role("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "admin.html"));
});
