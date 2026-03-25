import { Router } from "express";
import { TenantController } from "./tenant.controller";

const router = Router();

router.post("/", TenantController.createTenant);

export default router;