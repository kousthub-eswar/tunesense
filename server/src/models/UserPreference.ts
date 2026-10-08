import { Schema, model, Model } from 'mongoose';
import { IUserPreference, IPersonalizationSettings } from '../types/index.js';

const personalizationSettingsSchema = new Schema<IPersonalizationSettings>(
  {
    explorationLevel: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    diversityLevel: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
  },
  { _id: false }
);

const userPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    favoriteGenres: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    preferredGenres: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    favoriteArtists: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Artist' }],
      default: [],
    },
    preferredArtists: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Artist' }],
      default: [],
    },
    preferredLanguages: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: ['english'],
    },
    dislikedGenres: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    dislikedArtists: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Artist' }],
      default: [],
    },
    preferredEnergy: {
      type: Number,
      min: 0,
      max: 1,
      default: undefined,
    },
    preferredMood: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    preferredMoods: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    personalizationSettings: {
      type: personalizationSettingsSchema,
      default: () => ({ explorationLevel: 0.5, diversityLevel: 0.7 }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save hook: ensure preferredGenres/favoriteGenres and preferredArtists/favoriteArtists stay synchronized
userPreferenceSchema.pre('save', function () {
  if (this.preferredGenres && this.preferredGenres.length > 0 && (!this.favoriteGenres || this.favoriteGenres.length === 0)) {
    this.favoriteGenres = this.preferredGenres;
  } else if (this.favoriteGenres && this.favoriteGenres.length > 0 && (!this.preferredGenres || this.preferredGenres.length === 0)) {
    this.preferredGenres = this.favoriteGenres;
  }

  if (this.preferredArtists && this.preferredArtists.length > 0 && (!this.favoriteArtists || this.favoriteArtists.length === 0)) {
    this.favoriteArtists = this.preferredArtists;
  } else if (this.favoriteArtists && this.favoriteArtists.length > 0 && (!this.preferredArtists || this.preferredArtists.length === 0)) {
    this.preferredArtists = this.favoriteArtists;
  }
});

// Index Strategy:
// 1. userId: Unique index guaranteeing 1-to-1 relationship between User and their explicit preferences.
// userPreferenceSchema.index({ userId: 1 }, { unique: true }); -> Already handled by unique: true on userId field.

export const UserPreference: Model<IUserPreference> = model<IUserPreference>(
  'UserPreference',
  userPreferenceSchema
);
