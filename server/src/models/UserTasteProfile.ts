import { Schema, model, Model } from 'mongoose';
import {
  IUserTasteProfile,
  ITasteLayer,
  IBehaviouralMetrics,
  IContextDistribution,
} from '../types/index.js';

const tasteLayerSchema = new Schema<ITasteLayer>(
  {
    genres: [
      {
        genre: { type: String, required: true, trim: true, lowercase: true },
        score: { type: Number, required: true, min: 0, max: 1 },
      },
    ],
    artists: [
      {
        artistId: { type: Schema.Types.ObjectId, ref: 'Artist', required: true },
        score: { type: Number, required: true, min: 0, max: 1 },
      },
    ],
    languages: [
      {
        language: { type: String, required: true, trim: true, lowercase: true },
        score: { type: Number, required: true, min: 0, max: 1 },
      },
    ],
    audioFeatures: {
      energy: { type: Number, min: 0, max: 1 },
      danceability: { type: Number, min: 0, max: 1 },
      valence: { type: Number, min: 0, max: 1 },
      tempo: { type: Number, min: 0 },
      acousticness: { type: Number, min: 0, max: 1 },
      instrumentalness: { type: Number, min: 0, max: 1 },
    },
  },
  { _id: false }
);

const behaviouralMetricsSchema = new Schema<IBehaviouralMetrics>(
  {
    totalEvents: { type: Number, default: 0, min: 0 },
    playCount: { type: Number, default: 0, min: 0 },
    pauseCount: { type: Number, default: 0, min: 0 },
    skipCount: { type: Number, default: 0, min: 0 },
    completeCount: { type: Number, default: 0, min: 0 },
    skipRate: { type: Number, default: 0, min: 0, max: 1 },
    completionRate: { type: Number, default: 0, min: 0, max: 1 },
    averageCompletionPercent: { type: Number, default: 0, min: 0, max: 100 },
    totalListeningDurationSeconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const contextDistributionSchema = new Schema<IContextDistribution>(
  {
    timeOfDay: {
      morning: { type: Number, default: 0, min: 0, max: 1 },
      afternoon: { type: Number, default: 0, min: 0, max: 1 },
      evening: { type: Number, default: 0, min: 0, max: 1 },
      late_night: { type: Number, default: 0, min: 0, max: 1 },
      unknown: { type: Number, default: 0, min: 0, max: 1 },
    },
    dayOfWeek: {
      monday: { type: Number, default: 0, min: 0, max: 1 },
      tuesday: { type: Number, default: 0, min: 0, max: 1 },
      wednesday: { type: Number, default: 0, min: 0, max: 1 },
      thursday: { type: Number, default: 0, min: 0, max: 1 },
      friday: { type: Number, default: 0, min: 0, max: 1 },
      saturday: { type: Number, default: 0, min: 0, max: 1 },
      sunday: { type: Number, default: 0, min: 0, max: 1 },
      unknown: { type: Number, default: 0, min: 0, max: 1 },
    },
  },
  { _id: false }
);

const userTasteProfileSchema = new Schema<IUserTasteProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    profileVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    profileConfidence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 1,
    },
    longTerm: {
      type: tasteLayerSchema,
      required: true,
    },
    recent: {
      type: tasteLayerSchema,
      required: true,
    },
    trends: {
      genres: [
        {
          genre: { type: String, required: true },
          delta: { type: Number, required: true },
          direction: {
            type: String,
            required: true,
            enum: ['rising', 'declining', 'stable'],
          },
        },
      ],
    },
    behaviour: {
      type: behaviouralMetricsSchema,
      required: true,
    },
    context: {
      type: contextDistributionSchema,
      required: true,
    },
    metadata: {
      calculatedAt: { type: Date, default: Date.now },
      eventCountUsed: { type: Number, default: 0, min: 0 },
      uniqueSongsCount: { type: Number, default: 0, min: 0 },
      uniqueArtistsCount: { type: Number, default: 0, min: 0 },
      recentWindowDays: { type: Number, default: 30 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. userId: Unique index guaranteeing 1-to-1 relationship between User and their computed Taste Profile.
userTasteProfileSchema.index({ userId: 1 }, { unique: true });

// 2. calculatedAt: For staleness tracking and batch maintenance.
userTasteProfileSchema.index({ 'metadata.calculatedAt': -1 });

export const UserTasteProfile: Model<IUserTasteProfile> = model<IUserTasteProfile>(
  'UserTasteProfile',
  userTasteProfileSchema
);
