import { createApp } from './app.js';
import { config, validateStartupConfig } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import './models/index.js'; // Ensure all domain models and schemas are registered

const app = createApp();

async function startServer(): Promise<void> {
  // Validate production configuration
  const validation = validateStartupConfig();
  if (!validation.valid) {
    console.error('\n[TuneSense Server] FATAL: Production startup configuration check failed:');
    validation.errors.forEach((err) => console.error(`  ✖ ${err}`));
    console.error('Server execution halted to prevent insecure runtime operation.\n');
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.log('[TuneSense Server] Startup configuration diagnostics:');
    validation.warnings.forEach((warn) => console.log(`  ℹ ${warn}`));
  }

  // Initialize database connection prior to accepting traffic
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`[TuneSense Server] Running on http://localhost:${config.port}`);
    console.log(`[TuneSense Server] Environment: ${config.nodeEnv}`);
    console.log(`[TuneSense Server] Client Origin: ${config.clientOrigin}`);
    console.log(`[TuneSense Server] Health check: http://localhost:${config.port}/api/health`);
  });

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`\n[TuneSense Server] Received ${signal}. Closing HTTP server gracefully...`);
    server.close(async () => {
      console.log('[TuneSense Server] HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.on('SIGINT', () => void handleShutdown('SIGINT'));
}

void startServer();
