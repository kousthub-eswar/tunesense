import { Schema, model, Model } from 'mongoose';
import { IRecommendationImpression } from '../types/index.js';

const recommendationImpressionSchema = new Schema<IRecommendationImpression>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    songId: {
      type: Schema.Types.Mixed,
      required: [true, 'Song reference or identifier is required'],
    },
    strategy: {
      type: String,
      required: [true, 'Recommendation strategy is required'],
      trim: true,
      default: 'hybrid',
    },
    recommendationScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    position: {
      type: Number,
      required: true,
      min: 0,
    },
    mood: {
      type: String,
      trim: true,
      default: undefined,
    },
    sessionId: {
      type: String,
      trim: true,
      default: undefined,
    },
    recommendationRequestId: {
      type: String,
      required: [true, 'Recommendation request ID is required'],
      trim: true,
    },
    generatedAt: {
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
// 1. userId + generatedAt: User-level recommendation exposure analysis over time.
recommendationImpressionSchema.index({ userId: 1, generatedAt: -1 });

// 2. recommendationRequestId: For correlating batch impressions with click-through and playback events.
recommendationImpressionSchema.index({ recommendationRequestId: 1 });

// 3. songId: Item-level exposure frequency and catalogue coverage calculations.
recommendationImpressionSchema.index({ songId: 1 });

// 4. strategy: Fast grouping for strategy distribution and CTR comparison.
recommendationImpressionSchema.index({ strategy: 1 });

export const RecommendationImpression: Model<IRecommendationImpression> =
  model<IRecommendationImpression>(
    'RecommendationImpression',
    recommendationImpressionSchema
  );
