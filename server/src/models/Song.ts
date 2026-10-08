import { Schema, model, Model } from 'mongoose';
import { ISong, ISongMetadata } from '../types/index.js';

const songMetadataSchema = new Schema<ISongMetadata>(
  {
    tempo: { type: Number, min: 0, max: 300 },
    energy: { type: Number, min: 0, max: 1 },
    danceability: { type: Number, min: 0, max: 1 },
    valence: { type: Number, min: 0, max: 1 },
    acousticness: { type: Number, min: 0, max: 1 },
    instrumentalness: { type: Number, min: 0, max: 1 },
    key: { type: String, trim: true },
    mode: { type: Number, enum: [0, 1] },
  },
  { _id: false }
);

const songSchema = new Schema<ISong>(
  {
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
      minlength: [1, 'Song title cannot be empty'],
      maxlength: [200, 'Song title cannot exceed 200 characters'],
    },
    artistIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Artist' }],
      required: true,
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: 'A song must have at least one associated artist reference',
      },
    },
    albumId: {
      type: Schema.Types.ObjectId,
      ref: 'Album',
      default: undefined,
    },
    genres: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    languages: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    durationSeconds: {
      type: Number,
      required: [true, 'Duration in seconds is required'],
      min: [1, 'Duration must be at least 1 second'],
    },
    artworkUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    provider: {
      type: String,
      required: [true, 'Provider designation is required'],
      default: 'custom',
      trim: true,
      lowercase: true,
    },
    providerTrackId: {
      type: String,
      trim: true,
      default: undefined,
    },
    metadata: {
      type: songMetadataSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. title: For text matching, track lookup, and sorting.
songSchema.index({ title: 1 });

// 2. provider + providerTrackId: Compound sparse index to quickly resolve external provider tracks without duplicates.
songSchema.index(
  { provider: 1, providerTrackId: 1 },
  { sparse: true }
);

// 3. genres: Multikey index for fast mood/genre-based catalog filtering.
songSchema.index({ genres: 1 });

export const Song: Model<ISong> = model<ISong>('Song', songSchema);
