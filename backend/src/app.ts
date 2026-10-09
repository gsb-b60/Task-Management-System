import cors from "cors";
import express from "express";
import type { Express } from "express";
import "./lib/json.js";
import { frontendOrigins } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiRouter } from "./presentation/index.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(cors({ origin: frontendOrigins, credentials: true }));

  app.use(apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}