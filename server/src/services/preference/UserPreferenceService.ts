import mongoose, { Types } from 'mongoose';
import { UserPreference } from '../../models/index.js';
import { IUserPreference, UserPreferenceDto } from '../../types/index.js';
import { getDatabaseState } from '../../config/database.js';
import { UpdatePreferencesInput } from '../../validators/preferenceValidator.js';

export class UserPreferenceService {
  /**
   * Retrieves user explicit preferences. If no document exists, initializes a default one.
   */
  public async getPreferences(userId: string): Promise<UserPreferenceDto> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      return this.createDefaultDto(userId);
    }

    let prefDoc = await UserPreference.findOne({ userId: new Types.ObjectId(userId) });
    if (!prefDoc) {
      prefDoc = await UserPreference.create({
        userId: new Types.ObjectId(userId),
        favoriteGenres: [],
        preferredGenres: [],
        favoriteArtists: [],
        preferredArtists: [],
        preferredLanguages: ['english'],
        dislikedGenres: [],
        dislikedArtists: [],
        preferredMoods: [],
        personalizationSettings: { explorationLevel: 0.5, diversityLevel: 0.7 },
      });
    }

    return this.toDto(prefDoc);
  }

  /**
   * Updates user explicit preferences and personalization settings atomically.
   */
  public async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<UserPreferenceDto> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid user ID format');
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const fallback = this.createDefaultDto(userId);
      return {
        ...fallback,
        preferredGenres: input.preferredGenres || input.favoriteGenres || fallback.preferredGenres,
        preferredLanguages: input.preferredLanguages || fallback.preferredLanguages,
        dislikedGenres: input.dislikedGenres || fallback.dislikedGenres,
        preferredEnergy: input.preferredEnergy !== undefined ? input.preferredEnergy ?? undefined : fallback.preferredEnergy,
        preferredMood: input.preferredMood !== undefined ? input.preferredMood ?? undefined : fallback.preferredMood,
        personalizationSettings: {
          explorationLevel: input.personalizationSettings?.explorationLevel ?? fallback.personalizationSettings.explorationLevel,
          diversityLevel: input.personalizationSettings?.diversityLevel ?? fallback.personalizationSettings.diversityLevel,
        },
        updatedAt: new Date().toISOString(),
      };
    }

    const userObjId = new Types.ObjectId(userId);
    let prefDoc = await UserPreference.findOne({ userId: userObjId });
    if (!prefDoc) {
      prefDoc = new UserPreference({
        userId: userObjId,
      });
    }

    // Apply updates cleanly
    if (input.preferredGenres !== undefined) {
      prefDoc.preferredGenres = input.preferredGenres.map((g) => g.trim().toLowerCase());
      prefDoc.favoriteGenres = prefDoc.preferredGenres;
    } else if (input.favoriteGenres !== undefined) {
      prefDoc.favoriteGenres = input.favoriteGenres.map((g) => g.trim().toLowerCase());
      prefDoc.preferredGenres = prefDoc.favoriteGenres;
    }

    if (input.preferredLanguages !== undefined) {
      prefDoc.preferredLanguages = input.preferredLanguages.map((l) => l.trim().toLowerCase());
    }

    if (input.dislikedGenres !== undefined) {
      prefDoc.dislikedGenres = input.dislikedGenres.map((g) => g.trim().toLowerCase());
    }

    if (input.preferredArtists !== undefined) {
      prefDoc.preferredArtists = input.preferredArtists
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new Types.ObjectId(id));
      prefDoc.favoriteArtists = prefDoc.preferredArtists;
    }

    if (input.dislikedArtists !== undefined) {
      prefDoc.dislikedArtists = input.dislikedArtists
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new Types.ObjectId(id));
    }

    if (input.preferredEnergy !== undefined) {
      prefDoc.preferredEnergy = input.preferredEnergy ?? undefined;
    }

    if (input.preferredMood !== undefined) {
      prefDoc.preferredMood = input.preferredMood ?? undefined;
    }

    if (input.personalizationSettings) {
      prefDoc.personalizationSettings = {
        explorationLevel: input.personalizationSettings.explorationLevel ?? prefDoc.personalizationSettings?.explorationLevel ?? 0.5,
        diversityLevel: input.personalizationSettings.diversityLevel ?? prefDoc.personalizationSettings?.diversityLevel ?? 0.7,
      };
    }

    await prefDoc.save();
    return this.toDto(prefDoc);
  }

  private toDto(doc: IUserPreference): UserPreferenceDto {
    const genres = doc.preferredGenres?.length ? doc.preferredGenres : doc.favoriteGenres || [];
    const artists = (doc.preferredArtists?.length ? doc.preferredArtists : doc.favoriteArtists || []).map((id) => id.toString());
    const dislikedArtists = (doc.dislikedArtists || []).map((id) => id.toString());

    return {
      userId: doc.userId.toString(),
      preferredGenres: genres,
      preferredArtists: artists,
      preferredLanguages: doc.preferredLanguages || ['english'],
      dislikedGenres: doc.dislikedGenres || [],
      dislikedArtists,
      preferredEnergy: doc.preferredEnergy,
      preferredMood: doc.preferredMood,
      personalizationSettings: {
        explorationLevel: doc.personalizationSettings?.explorationLevel ?? 0.5,
        diversityLevel: doc.personalizationSettings?.diversityLevel ?? 0.7,
      },
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private createDefaultDto(userId: string): UserPreferenceDto {
    return {
      userId,
      preferredGenres: [],
      preferredArtists: [],
      preferredLanguages: ['english'],
      dislikedGenres: [],
      dislikedArtists: [],
      preferredEnergy: undefined,
      preferredMood: undefined,
      personalizationSettings: {
        explorationLevel: 0.5,
        diversityLevel: 0.7,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export const userPreferenceService = new UserPreferenceService();
