import mongoose from 'mongoose';
import { User, Song, Artist, Album, UserPreference, ListeningEvent } from '../models/index.js';

/**
 * Diagnostic utility to verify that all 6 domain schemas and their indexes are registered accurately.
 */
export function verifyModelRegistration(): {
  registeredModels: string[];
  indexesByModel: Record<string, unknown[]>;
} {
  const registeredModels = mongoose.modelNames();

  const indexesByModel: Record<string, unknown[]> = {
    User: User.schema.indexes(),
    Song: Song.schema.indexes(),
    Artist: Artist.schema.indexes(),
    Album: Album.schema.indexes(),
    UserPreference: UserPreference.schema.indexes(),
    ListeningEvent: ListeningEvent.schema.indexes(),
  };

  return {
    registeredModels,
    indexesByModel,
  };
}

// Self-executing runner for verification if executed directly via node/tsx
if (process.argv[1]?.includes('verifyModels')) {
  console.log('[TuneSense Verification] Checking Mongoose Models & Schemas:');
  const result = verifyModelRegistration();
  console.log('Registered Models:', result.registeredModels);
  console.log('Indexes Summary:');
  for (const [modelName, indexes] of Object.entries(result.indexesByModel)) {
    console.log(`- ${modelName}: ${indexes.length} index specifications`);
    for (const idx of indexes) {
      console.log(`    ${JSON.stringify(idx)}`);
    }
  }
}
