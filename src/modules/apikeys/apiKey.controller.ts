import { Request, Response } from "express";
import { ApiKeyService } from "./apiKey.service";

export const ApiKeyController = {
  async generateKey(req: Request, res: Response) {
    const tenantId = req.tenant.id;

    const { rawKey, apiKey } = await ApiKeyService.generateKey(tenantId);

    return res.json({
      message: "API key generated",
      apiKey,
      rawKey // only shown once
    });
  },

  async rotateKey(req: Request, res: Response) {
    const tenantId = req.tenant.id;
    const { oldKeyId } = req.body;
    req.action = "API_KEY_ROTATED";

    if (!oldKeyId) {
      throw {
        code: "API_KEY_ID_REQUIRED",
        message: "oldKeyId is missing",
      };
    }
    const { newKey, rawKey } = await ApiKeyService.rotateKey(tenantId, oldKeyId);

    return res.json({
      message: "API key rotated",
      newKey,
      rawKey
    });
  }
};