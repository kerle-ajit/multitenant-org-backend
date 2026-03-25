import app from "./app";
import { redis } from "./config/redis";
import { prisma } from "./config/db";

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Check DB connection
    await prisma.$connect();
    console.log("✔ PostgreSQL connected");

    // Check Redis connection
    await redis.ping();
    console.log("✔ Redis connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Error starting server:", err);
    process.exit(1);
  }
}

startServer();