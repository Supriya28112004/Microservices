import express from "express";
import authUserRoutes from "./routes/auth.js";
import logger from "./middlewares/logger.js";

const app=express();
app.use(express.json());
app.use(logger);
app.use("/authuser",authUserRoutes);
export default app;

// import express from "express";
// import authUserRoutes from "./routes/auth.js";
// import logger from "./middleware/logger.js";

// const app = express();

// // Middlewares
// app.use(express.json());
// app.use(logger);

// // Routes
// app.use("/authuser", authUserRoutes);

// // Health check
// app.get("/health", (req, res) => {
//   res.status(200).json({ status: "Auth-User-Service running ✅" });
// });

// export default app;
