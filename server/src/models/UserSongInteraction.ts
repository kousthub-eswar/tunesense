import { Schema, model, Model } from 'mongoose';
import { IUserSongInteraction } from '../types/index.js';

const userSongInteractionSchema = new Schema<IUserSongInteraction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    songId: {
      type: Schema.Types.ObjectId,
      ref: 'Song',
      required: [true, 'Song reference is required'],
    },
    interactionScore: {
      type: Number,
      required: true,
      default: 0,
    },
    playCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    skipCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastInteractionAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. Compound Unique index on { userId, songId }: Enforces sparse representation (one document per user-song pair)
userSongInteractionSchema.index({ userId: 1, songId: 1 }, { unique: true });

// 2. songId + interactionScore: Fast aggregation to locate other users interacting strongly with a song
userSongInteractionSchema.index({ songId: 1, interactionScore: -1 });

// 3. userId + interactionScore: Quick retrieval of a user's most positively engaged tracks
userSongInteractionSchema.index({ userId: 1, interactionScore: -1 });

// 4. lastInteractionAt: Recency maintenance, staleness checks, and activity sorting
userSongInteractionSchema.index({ lastInteractionAt: -1 });

export const UserSongInteraction: Model<IUserSongInteraction> = model<IUserSongInteraction>(
  'UserSongInteraction',
  userSongInteractionSchema
);
