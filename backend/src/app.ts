import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authenticate } from "./middleware/authenticate";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRouter } from "./routes/auth.routes";
import { costsRouter } from "./routes/costs.routes";
import { facilitiesRouter, publicFacilitiesRouter } from "./routes/facilities.routes";
import { laborEntriesRouter } from "./routes/labor-entries.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { inventoryRouter } from "./routes/inventory.routes";
import { reportsRouter } from "./routes/reports.routes";
import {
  publicServiceRequestsRouter,
  serviceRequestsRouter
} from "./routes/service-requests.routes";
import { uploadsRouter } from "./routes/uploads.routes";
import { usersRouter } from "./routes/users.routes";
import { workOrdersRouter } from "./routes/work-orders.routes";

export const app = express();
app.disable("etag");

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/service-requests", publicServiceRequestsRouter);
app.use("/api/facilities", publicFacilitiesRouter);

app.use("/api", authenticate);

app.use("/api/users", usersRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/work-orders", workOrdersRouter);
app.use("/api/labor-entries", laborEntriesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/costs", costsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/service-requests", serviceRequestsRouter);
app.use("/api/uploads", uploadsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
