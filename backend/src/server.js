import app from './app.js';
import { ensureBuckets } from './services/storageService.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`[NAWI Backend] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[NAWI Backend] Health check: http://localhost:${PORT}/api/health`);
  try {
    await ensureBuckets();
  } catch (err) {
    console.warn('[STORAGE] Bucket initialization notice:', err.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

export default server;
