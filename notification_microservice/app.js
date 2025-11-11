// src/app.js
import express from "express";
import emailRoutes from "./routes/emailRoute.js";
import logger from "../../shared/middleware/logger.js";

const app = express();
app.use(express.json());
app.use(logger);
app.use("/notify/email", emailRoutes);

export default app;
