import express from "express";
import { getStatisticsList } from "../controllers/statisticsController.js";

const router = express.Router();

router.get("/list", getStatisticsList);

export default router;
