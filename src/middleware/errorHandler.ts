import { Request, Response, NextFunction } from "express";
import { PrismaClientValidationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export function errorHandler(
  err: any,
  _req: Request,  // prefixed with _ to indicate unused
  res: Response,
  _next: NextFunction  // prefixed with _ to indicate unused
) {
  console.error("[ERROR]", err);

  // prisma validation error
  if (err instanceof PrismaClientValidationError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: err.message,
      },
    });
  }

  // prisma constraint error
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_RECORD",
          message: "Resource already exists",
          details: err.meta,
        },
      });
    }
  }

  // idempotency errors
  if (err.code === "IDEMPOTENCY_KEY_REQUIRED") {
    return res.status(400).json({ error: err });
  }

  // authentication errors
  if (err.code === "UNAUTHORIZED") {
    return res.status(401).json({ error: err });
  }

  // default catch-all error
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      details: err.message ?? null,
    },
  });
}