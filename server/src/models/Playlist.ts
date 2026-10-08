import { Schema, model, Model } from 'mongoose';
import { IPlaylist } from '../types/index.js';

const playlistSchema = new Schema<IPlaylist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true,
      maxlength: [100, 'Playlist name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Playlist description cannot exceed 500 characters'],
      default: '',
    },
    songIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
      default: [],
      validate: {
        validator: function (val: Schema.Types.ObjectId[]) {
          return val.length <= 500;
        },
        message: 'Playlist cannot contain more than 500 songs',
      },
    },
    coverSongId: {
      type: Schema.Types.ObjectId,
      ref: 'Song',
      default: undefined,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient user playlist retrieval sorted by recency
playlistSchema.index({ userId: 1, updatedAt: -1 });

export const Playlist: Model<IPlaylist> = model<IPlaylist>(
  'Playlist',
  playlistSchema
);
