import express from "express";
import cors from "cors";
import dashboardRouter from "./routers/index.js";
import settingRouter from "./routers/settingRouter.js";
import statisticsRouter from "./routers/statisticsRouter.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.use("/api", dashboardRouter);
app.use("/api/setting", settingRouter);
app.use("/api/statistics", statisticsRouter);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
