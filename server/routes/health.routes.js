// routes/health.routes.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BLACKOUT API is running',
    phase: 'Phase 5 — Production Ready',
    timestamp: new Date().toISOString(),
  });
});

export default router;
