import { Schema, model, Model } from 'mongoose';
import { IArtist, IArtistMetadata } from '../types/index.js';

const artistMetadataSchema = new Schema<IArtistMetadata>(
  {
    bio: { type: String, trim: true, maxlength: 2000 },
    country: { type: String, trim: true, maxlength: 100 },
    externalUrls: { type: Map, of: String, default: undefined },
  },
  { _id: false }
);

const artistSchema = new Schema<IArtist>(
  {
    name: {
      type: String,
      required: [true, 'Artist name is required'],
      trim: true,
      minlength: [1, 'Artist name cannot be empty'],
      maxlength: [150, 'Artist name cannot exceed 150 characters'],
    },
    imageUrl: {
      type: String,
      trim: true,
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
    metadata: {
      type: artistMetadataSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. name: Index for fast artist searches and alphabetized listing.
artistSchema.index({ name: 1 });

export const Artist: Model<IArtist> = model<IArtist>('Artist', artistSchema);
