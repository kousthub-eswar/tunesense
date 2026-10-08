import { Schema, model, Model } from 'mongoose';
import { IUserSimilarity } from '../types/index.js';

const userSimilaritySchema = new Schema<IUserSimilarity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    similarUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Similar user reference is required'],
    },
    similarity: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    commonSongs: {
      type: Number,
      required: true,
      min: 0,
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    profileVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. Unique compound index { userId, similarUserId }: Prevents duplicate pairwise similarity records
userSimilaritySchema.index({ userId: 1, similarUserId: 1 }, { unique: true });

// 2. userId + similarity descending: Fast retrieval of top-N similar neighbors for a target user
userSimilaritySchema.index({ userId: 1, similarity: -1 });

// 3. calculatedAt: For cache invalidation and staleness detection
userSimilaritySchema.index({ calculatedAt: -1 });

export const UserSimilarity: Model<IUserSimilarity> = model<IUserSimilarity>(
  'UserSimilarity',
  userSimilaritySchema
);
