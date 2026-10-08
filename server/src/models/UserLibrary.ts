import { Schema, model, Model } from 'mongoose';
import { IUserLibrary } from '../types/index.js';

const userLibrarySchema = new Schema<IUserLibrary>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    likedSongIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
      default: [],
    },
    savedPlaylistIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Playlist' }],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index strategy:
// 1. userId: Unique index guaranteeing 1-to-1 relationship between User and their library.
userLibrarySchema.index({ userId: 1 }, { unique: true });

export const UserLibrary: Model<IUserLibrary> = model<IUserLibrary>(
  'UserLibrary',
  userLibrarySchema
);
