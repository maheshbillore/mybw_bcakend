// memoryRoute.js
import express from "express"; 

const router = express.Router();

router.get("/memory", (req, res) => {
  const memoryUsage = process.memoryUsage();

  const formatted = {
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + " MB",
    heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + " MB",
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB",
    external: (memoryUsage.external / 1024 / 1024).toFixed(2) + " MB",
  };

  res.json(formatted);
});

export default router;
