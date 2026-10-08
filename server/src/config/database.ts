import mongoose from 'mongoose';
import { config } from './index.js';

interface DatabaseState {
  isConnected: boolean;
  dbName?: string;
  host?: string;
}

/**
 * Sanitizes a MongoDB connection URI to safely mask credentials in any diagnostic logging.
 */
function sanitizeMongoUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = '****';
    }
    if (url.username) {
      url.username = '****';
    }
    return url.toString();
  } catch {
    return 'mongodb://[credentials-hidden]';
  }
}

/**
 * Connects to MongoDB Atlas using Mongoose.
 * If MONGODB_URI is not provided or connection fails, enters a documented degraded state.
 */
export async function connectDatabase(): Promise<boolean> {
  if (!config.mongodbUri) {
    console.warn(
      '\n[TuneSense Database] Configuration Warning: MONGODB_URI is not configured in environment.'
    );
    console.warn(
      '[TuneSense Database] Running in DEGRADED mode without an active MongoDB connection.'
    );
    console.warn(
      '[TuneSense Database] Action Required: Set MONGODB_URI in server/.env to enable persistence.\n'
    );
    return false;
  }

  try {
    const sanitizedTarget = sanitizeMongoUri(config.mongodbUri);
    console.log(`[TuneSense Database] Connecting to MongoDB: ${sanitizedTarget}...`);

    await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName,
      serverSelectionTimeoutMS: 8000,
      autoIndex: true, // Build defined indexes on startup in development
    });

    console.log(
      `[TuneSense Database] Successfully connected to database: "${config.mongodbDbName}"`
    );
    return true;
  } catch (error) {
    console.error(
      '[TuneSense Database] Failed to connect to MongoDB Atlas:',
      error instanceof Error ? error.message : 'Unknown database connection error'
    );
    console.error(
      '[TuneSense Database] Server will start in DEGRADED mode. Database operations will remain unavailable.'
    );
    return false;
  }
}

/**
 * Disconnects safely from MongoDB during application shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    console.log('[TuneSense Database] Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('[TuneSense Database] Disconnected cleanly.');
  }
}

/**
 * Returns current connection state diagnostics without leaking sensitive data.
 */
export function getDatabaseState(): DatabaseState {
  const isConnected = mongoose.connection.readyState === 1;
  return {
    isConnected,
    dbName: isConnected ? mongoose.connection.name : undefined,
    host: isConnected ? mongoose.connection.host : undefined,
  };
}

export const dbState = {
  get isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  },
};
