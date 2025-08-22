// // server.js
// import express from "express";
// import bodyParser from "body-parser";
// import mongoose from "mongoose";
// import cors from "cors";

// const app = express();
// const PORT = 4000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // MongoDB Connection
// mongoose
//   .connect(
//     "mongodb+srv://KARTHIA:KARVARSHR@rfid-attendance-system.lrhp99v.mongodb.net/test?retryWrites=true&w=majority"
//   )
//   .then(() => console.log("✅ MongoDB connected to test database"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// const tallySchema = new mongoose.Schema(
//   {
//     company: String,
//     ledger: Object,
//     vouchers: Array,
//   },
//   { timestamps: true }
// );

// const TallyData = mongoose.model("TallyData", tallySchema);

// // Route to receive data from agent
// app.post("/tally-data", async (req, res) => {
//   try {
//     const tallyData = req.body;

//     console.log("✅ Received Tally Data:", tallyData);

//     const saved = new TallyData(tallyData);
//     await saved.save();

//     res
//       .status(200)
//       .json({ message: "Tally data saved successfully", data: saved });
//   } catch (error) {
//     console.error("❌ Error handling Tally data:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// // Route to fetch all saved data for frontend
// app.get("/tally-data", async (req, res) => {
//   try {
//     const data = await TallyData.find().sort({ createdAt: -1 });
//     res.json(data);
//   } catch (error) {
//     console.error("❌ Error fetching Tally data:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Backend running at http://localhost:${PORT}`);
// });

// server.js
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // load .env variables

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schema
const tallySchema = new mongoose.Schema(
  {
    company: String,
    ledger: Object,
    vouchers: Array,
  },
  { timestamps: true }
);

const TallyData = mongoose.model("TallyData", tallySchema);

// Route to receive data from agent
app.post("/tally-data", async (req, res) => {
  try {
    const tallyData = req.body;

    console.log("✅ Received Tally Data:", tallyData);

    const saved = new TallyData(tallyData);
    await saved.save();

    res
      .status(200)
      .json({ message: "Tally data saved successfully", data: saved });
  } catch (error) {
    console.error("❌ Error handling Tally data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Route to fetch all saved data for frontend
app.get("/tally-data", async (req, res) => {
  try {
    const data = await TallyData.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    console.error("❌ Error fetching Tally data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/", async (req, res) => {
  res.end("helo");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
