import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health";
import rouletteRoutes from "./routes/roulette";
import tourRoutes from "./routes/tours";
import rightNowRoutes from "./routes/right-now";
import superlativeRoutes from "./routes/superlatives";
import chainRoutes from "./routes/chains";
import triviaRoutes from "./routes/trivia";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(cors());
app.use(express.json());

// All routes under /api/v1
const v1 = express.Router();
v1.use(healthRoutes);
v1.use(rouletteRoutes);
v1.use(tourRoutes);
v1.use(rightNowRoutes);
v1.use(superlativeRoutes);
v1.use(chainRoutes);
v1.use(triviaRoutes);

app.use("/api/v1", v1);

// Start
app.listen(PORT, () => {
  console.log(`TourGraph API listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/v1/health`);
});
