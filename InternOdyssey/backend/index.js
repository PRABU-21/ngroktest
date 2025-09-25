const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/match");
const cors = require("cors");
dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],  // allow frontend on different ports
  credentials: true                 // allow cookies/auth headers if needed
}));
// Public routes
app.use("/api/auth", authRoutes);
app.use("/api", matchRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
