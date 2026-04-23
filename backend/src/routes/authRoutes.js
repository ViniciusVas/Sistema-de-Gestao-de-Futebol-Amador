import express from "express";
import { register, login, forgotPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/token", login);
router.post("/forgot-password", forgotPassword);

export default router;