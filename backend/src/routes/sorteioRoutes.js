import express from "express";
import { sortearTimes, listarTimes } from "../controllers/sorteioController.js";

const router = express.Router();

router.post("/peladas/:id/sortear", sortearTimes);
router.get("/peladas/:id/times", listarTimes);

export default router;