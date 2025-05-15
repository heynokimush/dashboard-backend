import express from "express";
import {
  createDashboard,
  getDashboardList,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
} from "../controllers/settingController.js";

const router = express.Router();

router.post("/create", createDashboard);
router.get("/list", getDashboardList);
router.get("/read", getDashboardById);
router.patch("/update", updateDashboard);
router.delete("/delete", deleteDashboard);

export default router;
