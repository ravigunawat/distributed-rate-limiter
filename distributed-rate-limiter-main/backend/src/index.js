require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authMiddleware = require("./middleware/auth");
const checkRoute = require("./routes/check");
const adminRoute = require("./routes/admin");
const healthRoute = require("./routes/health");

const app = express();
app.use(cors());
app.use(express.json());

// Public routes
app.use("/api", healthRoute);
app.use("/api", adminRoute);

// Protected routes (require X-API-Key)
app.use("/api", authMiddleware, checkRoute);

app.get("/", (req, res) => {
  res.json({ message: "Distributed Rate-Limiting API Service is running" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
