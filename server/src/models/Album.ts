import { Schema, model, Model } from 'mongoose';
import { IAlbum } from '../types/index.js';

const albumSchema = new Schema<IAlbum>(
  {
    title: {
      type: String,
      required: [true, 'Album title is required'],
      trim: true,
      minlength: [1, 'Album title cannot be empty'],
      maxlength: [200, 'Album title cannot exceed 200 characters'],
    },
    artistIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Artist' }],
      required: true,
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: 'An album must have at least one associated artist reference',
      },
    },
    artworkUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    releaseDate: {
      type: Date,
      default: undefined,
    },
    genres: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. title: Index for album searching and lookups.
albumSchema.index({ title: 1 });

export const Album: Model<IAlbum> = model<IAlbum>('Album', albumSchema);
