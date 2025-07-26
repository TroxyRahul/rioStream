import { Router } from "express";
import * as controller from "../controllers/stream.js";

const streamRouter = Router();

// This handles: /api/rio/stream/:id
streamRouter.get("/stream/:id", controller.handleStream);
// If you want to support /:id/:season/:episode also:
streamRouter.get("/stream/:id/:season/:episode", controller.handleStream);

export default streamRouter;