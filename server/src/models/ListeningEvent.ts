import { Schema, model, Model } from 'mongoose';
import {
  IListeningEvent,
  IListeningEventContext,
  IListeningEventMetadata,
} from '../types/index.js';

const listeningEventContextSchema = new Schema<IListeningEventContext>(
  {
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'late_night', 'night', 'unknown'],
      default: 'unknown',
    },
    dayOfWeek: {
      type: String,
      enum: [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'unknown',
      ],
      default: 'unknown',
    },
    sessionId: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  { _id: false }
);

const listeningEventMetadataSchema = new Schema<IListeningEventMetadata>(
  {
    dwellDurationSeconds: { type: Number, min: 0 },
    completionRate: { type: Number, min: 0, max: 1 },
    positionSeconds: { type: Number, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    completionPercent: { type: Number, min: 0, max: 100 },
    playbackSpeed: { type: Number, default: 1.0 },
    deviceType: { type: String, trim: true },
    recommendationRequestId: { type: String, trim: true, default: undefined },
    recommendationStrategy: { type: String, trim: true, default: undefined },
    recommendationPosition: { type: Number, min: 0, default: undefined },
  },
  { _id: false }
);

const listeningEventSchema = new Schema<IListeningEvent>(
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
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ['play', 'complete', 'skip', 'pause'],
        message: '{VALUE} is not a valid event type',
      },
    },
    timestamp: {
      type: Date,
      required: [true, 'Interaction event timestamp is required'],
      default: Date.now,
    },
    context: {
      type: listeningEventContextSchema,
      default: undefined,
    },
    metadata: {
      type: listeningEventMetadataSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. userId + timestamp: Essential compound index for fetching chronological user interaction history and computing personalized recommendations.
listeningEventSchema.index({ userId: 1, timestamp: -1 });

// 2. songId + timestamp: Essential compound index for computing track-level metrics, item popularity, and collaborative filtering associations.
listeningEventSchema.index({ songId: 1, timestamp: -1 });

// 3. recommendationRequestId (sparse): Fast aggregation of recommendation plays and completion attribution.
listeningEventSchema.index({ 'metadata.recommendationRequestId': 1 }, { sparse: true });

export const ListeningEvent: Model<IListeningEvent> = model<IListeningEvent>(
  'ListeningEvent',
  listeningEventSchema
);
