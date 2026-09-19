require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const { registerShutdown } = require("./Config/Prisma");
const router = require("./Routes/Routers");
const {
  corsOptionsDelegate,
  apiErrorHandler,
} = require("./Config/Http");
const { API_PREFIX } = require("./Common/Constants");
const app = express();
const PORT = process.env.PORT || 3000;


// Default cors() for every route; AirproX routes get credentialed CORS for their allowed origins
app.use(cors(corsOptionsDelegate));
app.use(cookieParser());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use(router);

// Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Views", "homeScreen.html"));
});

// AirproX API Errors
app.use(API_PREFIX, apiErrorHandler);

// Global File Upload Error
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(200).json({ success: false, error: err.message });
  } else if (err) {
    res.status(200).json({ success: false, error: err.message });
  } else {
    next();
  }
});

// Handle unknown routes
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, "Views", "notFound.html"));
});

const server = app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);
});


registerShutdown(server);
