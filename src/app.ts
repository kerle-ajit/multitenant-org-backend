
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { apiKeyAuth } from "./middleware/apiKeyAuth";
import { auditLogger } from "./middleware/audit.middleware";
import { errorHandler } from "./middleware/errorHandler";

// Routers
import tenantRouter from "./modules/tenants/tenant.routes";
import userRouter from "./modules/users/user.routes";
import apiKeyRouter from "./modules/apikeys/apiKey.routes";
import emailRouter from "./modules/email/email.routes";
import auditRouter from "./modules/audit/audit.routes";

const app = express();

// Global middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// ---------------------------
// 1. PUBLIC ROUTES (NO API KEY)
// ---------------------------
app.use("/tenants", tenantRouter); // register tenant, etc.

// ---------------------------
// 2. API KEY PROTECTED ROUTES
// ---------------------------
app.use(apiKeyAuth);      // validate API key + inject tenant context
app.use(auditLogger);     // audit all state-changing actions

// Protected routes
app.use("/users", userRouter);
app.use("/apikeys", apiKeyRouter);
app.use("/emails", emailRouter);
app.use("/audit", auditRouter);

// Default Health Check
app.get("/", (_req, res) => {
  res.json({ message: "Multi-Tenant Backend Running" });
});

// Global Error Handler
app.use(errorHandler);

export default app;