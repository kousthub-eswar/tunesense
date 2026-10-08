import mongoose, { Types } from 'mongoose';
import { Song, ListeningEvent } from '../../models/index.js';
import { CreateListeningEventInput } from '../../validators/listeningEventValidators.js';
import { ListeningEventDto, IListeningEventContext, IListeningEventMetadata } from '../../types/index.js';
import { getDatabaseState } from '../../config/database.js';
import { collaborativeService } from '../recommendation/CollaborativeService.js';
import { userTasteProfileService } from '../profile/UserTasteProfileService.js';

export class ListeningEventService {
  /**
   * Validates and persists an authenticated user listening event.
   * Ensures the song exists in MongoDB to prevent orphan records.
   */
  public async recordEvent(
    userId: string,
    input: CreateListeningEventInput
  ): Promise<ListeningEventDto> {
    if (!userId || !mongoose.isValidObjectId(userId)) {
      const err = new Error('Invalid authenticated user identity');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      const err = new Error('Database is disconnected. Listening events cannot be persisted in degraded mode.');
      (err as unknown as { status: number }).status = 503;
      throw err;
    }

    // 1. Song Validation: Verify referenced song exists in MongoDB
    let songDoc = null;
    if (mongoose.isValidObjectId(input.songId)) {
      songDoc = await Song.findById(input.songId);
    }

    if (!songDoc) {
      // Also check if songId was supplied as external providerTrackId
      songDoc = await Song.findOne({ providerTrackId: input.songId });
    }

    if (!songDoc) {
      const err = new Error(`Song not found: ${input.songId}`);
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    // 2. Playback calculation and normalization
    const position = Math.max(0, input.playback?.positionSeconds ?? 0);
    const duration = Math.max(0, input.playback?.durationSeconds ?? songDoc.durationSeconds ?? 0);

    let completionPercent = 0;
    if (typeof input.playback?.completionPercent === 'number' && !isNaN(input.playback.completionPercent)) {
      completionPercent = Math.min(100, Math.max(0, input.playback.completionPercent));
    } else if (duration > 0 && !isNaN(position) && isFinite(position)) {
      completionPercent = Math.min(100, Math.max(0, Number(((position / duration) * 100).toFixed(2))));
    }

    const completionRate = Math.min(1, Math.max(0, Number((completionPercent / 100).toFixed(4))));
    const playbackSpeed = input.playback?.playbackSpeed ?? 1.0;

    // 3. Deduplication Check: Prevent immediate duplicate event signals (e.g. duplicate play within 2s)
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const recentDuplicate = await ListeningEvent.findOne({
      userId: new Types.ObjectId(userId),
      songId: songDoc._id,
      eventType: input.eventType,
      timestamp: { $gte: twoSecondsAgo },
    }).sort({ timestamp: -1 });

    if (recentDuplicate && input.eventType === 'play') {
      const incomingRecId =
        input.recommendation?.recommendationRequestId || input.metadata?.recommendationRequestId;
      if (incomingRecId && !recentDuplicate.metadata?.recommendationRequestId) {
        const meta = (recentDuplicate.metadata || {}) as IListeningEventMetadata;
        meta.recommendationRequestId = incomingRecId;
        meta.recommendationStrategy =
          input.recommendation?.recommendationStrategy || input.metadata?.recommendationStrategy;
        meta.recommendationPosition =
          input.recommendation?.recommendationPosition ?? input.metadata?.recommendationPosition;
        recentDuplicate.metadata = meta;
        await recentDuplicate.save();
      }
      // Return existing event DTO safely without writing a duplicate document
      return this.toDto(recentDuplicate);
    }

    // 4. Construct Context
    const eventContext: IListeningEventContext = {
      sessionId: input.context?.sessionId,
      timeOfDay: input.context?.timeOfDay || 'unknown',
      dayOfWeek: input.context?.dayOfWeek || 'unknown',
    };

    // 5. Construct Metadata
    const eventMetadata: IListeningEventMetadata = {
      dwellDurationSeconds: position,
      completionRate,
      positionSeconds: position,
      durationSeconds: duration,
      completionPercent,
      playbackSpeed,
      deviceType: input.context?.deviceType || 'unknown',
      recommendationRequestId:
        input.recommendation?.recommendationRequestId || input.metadata?.recommendationRequestId,
      recommendationStrategy:
        input.recommendation?.recommendationStrategy || input.metadata?.recommendationStrategy,
      recommendationPosition:
        input.recommendation?.recommendationPosition ?? input.metadata?.recommendationPosition,
    };

    const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();

    // 6. Create ListeningEvent document
    const eventDoc = await ListeningEvent.create({
      userId: new Types.ObjectId(userId),
      songId: songDoc._id,
      eventType: input.eventType,
      timestamp,
      context: eventContext,
      metadata: eventMetadata,
    });

    // 7. Personalization pipeline materialization (failsafe)
    // Synchronously updates sparse UserSongInteraction for (userId, songId),
    // refreshes UserTasteProfile materialized view, and invalidates similarity cache
    // so future recommendations reflect this event immediately.
    try {
      await collaborativeService.updateUserSongInteraction(userId, songDoc._id.toString());
      await userTasteProfileService.rebuildProfile(userId);
      await collaborativeService.invalidateSimilarityCache(userId);
    } catch (materializationError) {
      console.warn(
        '[ListeningEventService] Non-fatal personalization pipeline materialization notice:',
        materializationError
      );
    }

    return this.toDto(eventDoc);
  }

  /**
   * Transforms Mongoose document to clean, safe DTO
   */
  private toDto(doc: any): ListeningEventDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      songId: doc.songId.toString(),
      eventType: doc.eventType,
      timestamp: doc.timestamp.toISOString ? doc.timestamp.toISOString() : new Date(doc.timestamp).toISOString(),
      playback: {
        positionSeconds: doc.metadata?.positionSeconds ?? doc.metadata?.dwellDurationSeconds ?? 0,
        durationSeconds: doc.metadata?.durationSeconds ?? 0,
        completionPercent: doc.metadata?.completionPercent ?? Math.round((doc.metadata?.completionRate ?? 0) * 100),
      },
      context: {
        sessionId: doc.context?.sessionId,
        timeOfDay: doc.context?.timeOfDay,
        dayOfWeek: doc.context?.dayOfWeek,
        deviceType: doc.metadata?.deviceType,
      },
    };
  }
}

export const listeningEventService = new ListeningEventService();
