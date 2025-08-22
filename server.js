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

// // server.js
// import express from "express";
// import bodyParser from "body-parser";
// import mongoose from "mongoose";
// import cors from "cors";
// import dotenv from "dotenv";

// dotenv.config(); // load .env variables

// const app = express();
// const PORT = process.env.PORT;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch((err) => console.error("❌ MongoDB connection error:", err));

// // Schema
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

// app.get("/", async (req, res) => {
//   res.end("helo");
// });

// // Start server
// app.listen(PORT, () => {
//   console.log(`🚀 Backend running at http://localhost:${PORT}`);
// });

import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" })); // Increase limit for large Tally data
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Enhanced schemas for different data types
const baseSchema = {
  type: { type: String, required: true }, // companies, ledgers, vouchers, etc.
  data: { type: mongoose.Schema.Types.Mixed }, // Raw Tally data
  recordCount: { type: Number, default: 0 },
  source: { type: String, default: "tally-agent" },
  agentVersion: String,
  timestamp: { type: Date, default: Date.now },
  processingStatus: {
    type: String,
    enum: ["received", "processed", "error"],
    default: "received",
  },
};

const tallyDataSchema = new mongoose.Schema(baseSchema, {
  timestamps: true,
  collection: "tally_sync_data",
});

// Create index for better query performance
tallyDataSchema.index({ type: 1, timestamp: -1 });
tallyDataSchema.index({ timestamp: -1 });

const TallyData = mongoose.model("TallyData", tallyDataSchema);

// Separate collections for processed data (optional, for better organization)
const processedSchemas = {
  companies: new mongoose.Schema(
    {
      name: String,
      guid: String,
      remoteId: String,
      createdDate: Date,
      alteredDate: Date,
      syncTime: Date,
    },
    { timestamps: true }
  ),

  ledgers: new mongoose.Schema(
    {
      name: String,
      parent: String,
      alias: String,
      guid: String,
      openingBalance: Number,
      closingBalance: Number,
      gstRegistrationType: String,
      partyGSTIN: String,
      syncTime: Date,
    },
    { timestamps: true }
  ),

  vouchers: new mongoose.Schema(
    {
      guid: String,
      date: Date,
      voucherTypeName: String,
      voucherNumber: String,
      partyLedgerName: String,
      amount: Number,
      narration: String,
      syncTime: Date,
    },
    { timestamps: true }
  ),
};

// Create models for processed data
const ProcessedModels = {
  companies: mongoose.model("Company", processedSchemas.companies),
  ledgers: mongoose.model("Ledger", processedSchemas.ledgers),
  vouchers: mongoose.model("Voucher", processedSchemas.vouchers),
};

// Main route to receive data from Tally agent
app.post("/tally-data", async (req, res) => {
  try {
    const { type, data, recordCount, source, agentVersion, timestamp } =
      req.body;

    console.log(
      `📥 Received ${type} data: ${recordCount} records from ${source}`
    );

    // Validate required fields
    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type and data",
      });
    }

    // Save raw data
    const tallyRecord = new TallyData({
      type,
      data,
      recordCount: recordCount || 0,
      source: source || "unknown",
      agentVersion,
      timestamp: timestamp || new Date(),
    });

    const saved = await tallyRecord.save();

    // Process and save to specific collections (optional)
    try {
      await processAndSaveData(type, data);
      saved.processingStatus = "processed";
      await saved.save();
    } catch (processingError) {
      console.error(
        `⚠️ Error processing ${type} data:`,
        processingError.message
      );
      saved.processingStatus = "error";
      await saved.save();
    }

    console.log(`✅ ${type} data saved successfully (ID: ${saved._id})`);

    res.status(200).json({
      success: true,
      message: `${type} data received and saved successfully`,
      recordId: saved._id,
      recordCount: recordCount || 0,
    });
  } catch (error) {
    console.error("❌ Error handling Tally sync data:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// Process raw Tally data and save to specific collections
async function processAndSaveData(type, rawData) {
  if (!ProcessedModels[type]) {
    console.log(`ℹ️ No specific processor for ${type}, skipping processing`);
    return;
  }

  try {
    const envelope = rawData?.ENVELOPE;
    const body = envelope?.BODY?.[0];
    const dataSection = body?.DATA;

    if (!dataSection) {
      throw new Error(`No data section found for ${type}`);
    }

    // Find the collection in the data
    const collections = Object.keys(dataSection);
    let items = [];

    for (const collectionName of collections) {
      const collection = dataSection[collectionName];
      if (Array.isArray(collection)) {
        items = collection;
        break;
      }
    }

    if (items.length === 0) {
      console.log(`No items found for ${type}`);
      return;
    }

    // Process each item based on type
    const processedItems = items.map((item) => processItem(type, item));

    // Clear existing data for this sync (optional - you might want to keep history)
    // await ProcessedModels[type].deleteMany({});

    // Insert new data
    if (processedItems.length > 0) {
      await ProcessedModels[type].insertMany(processedItems, {
        ordered: false,
      });
      console.log(`✅ Processed ${processedItems.length} ${type} items`);
    }
  } catch (error) {
    throw new Error(`Failed to process ${type} data: ${error.message}`);
  }
}

// Process individual items based on type
function processItem(type, item) {
  const now = new Date();

  switch (type) {
    case "companies":
      return {
        name: item.NAME,
        guid: item.GUID,
        remoteId: item.REMOTEID,
        createdDate: item.CREATEDDATE ? new Date(item.CREATEDDATE) : null,
        alteredDate: item.ALTEREDDATE ? new Date(item.ALTEREDDATE) : null,
        syncTime: now,
      };

    case "ledgers":
      return {
        name: item.NAME,
        parent: item.PARENT,
        alias: item.ALIAS,
        guid: item.GUID,
        openingBalance: parseFloat(item.OPENINGBALANCE),
        closingBalance: parseFloat(item.CLOSINGBALANCE),
        gstRegistrationType: item.GSTREGISTRATIONTYPE,
        partyGSTIN: item.PARTYGSTIN,
        syncTime: now,
      };

    case "vouchers":
      return {
        guid: item.GUID,
        date: item.DATE ? new Date(item.DATE) : null,
        voucherTypeName: item.VOUCHERTYPENAME,
        voucherNumber: item.VOUCHERNUMBER,
        partyLedgerName: item.PARTYLEDGERNAME,
        amount: parseFloat(item.AMOUNT),
        narration: item.NARRATION,
        syncTime: now,
      };

    default:
      return { ...item, syncTime: now };
  }
}

// Routes to fetch data

// Get all sync records
app.get("/tally-sync", async (req, res) => {
  try {
    const { type, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (type) query.type = type;

    const data = await TallyData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select("-data"); // Exclude large data field for listing

    const total = await TallyData.countDocuments(query);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching sync records:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Get specific sync record with full data
app.get("/tally-sync/:id", async (req, res) => {
  try {
    const data = await TallyData.findById(req.params.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching sync record:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Get processed data by type
app.get("/processed/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    if (!ProcessedModels[type]) {
      return res.status(400).json({
        success: false,
        message: `Invalid data type: ${type}`,
      });
    }

    const data = await ProcessedModels[type]
      .find()
      .sort({ syncTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ProcessedModels[type].countDocuments();

    res.json({
      success: true,
      type,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.type} data:`, error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Health check and stats
app.get("/health", async (req, res) => {
  try {
    const stats = await TallyData.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalRecords: { $sum: "$recordCount" },
          lastSync: { $max: "$timestamp" },
        },
      },
    ]);

    res.json({
      success: true,
      status: "healthy",
      mongodb: "connected",
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "Tally Sync Backend API",
    version: "2.0.0",
    endpoints: {
      "POST /tally-sync": "Receive data from Tally agent",
      "GET /tally-sync": "List all sync records",
      "GET /tally-sync/:id": "Get specific sync record",
      "GET /processed/:type": "Get processed data by type",
      "GET /health": "Health check and statistics",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Tally Backend running at http://localhost:${PORT}`);
  console.log(
    `📊 Available data types: ${Object.keys(ProcessedModels).join(", ")}`
  );
});
