import { apiRequest } from './apiClient.js';
import type {
  ListeningEventPayload,
  ListeningEventResponse,
  ListeningEventType,
} from '../types/index.js';

function getSessionId(): string {
  const key = 'tunesense_listening_session_id';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'sess_fallback_' + Date.now();
  }
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'late_night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late_night';
}

function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'mobile';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function computeCompletionPercent(position: number, duration: number): number {
  if (!duration || duration <= 0 || isNaN(position) || isNaN(duration)) {
    return 0;
  }
  const pct = (position / duration) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

export const listeningEventService = {
  /**
   * Safely dispatches a listening event to the backend.
   * Non-blocking: will never crash or halt playback on error.
   */
  async sendEvent(
    eventType: ListeningEventType,
    songId: string,
    positionSeconds = 0,
    durationSeconds = 0,
    metadata?: {
      recommendationRequestId?: string;
      recommendationStrategy?: string;
      recommendationPosition?: number;
      [key: string]: unknown;
    }
  ): Promise<ListeningEventResponse | null> {
    if (!songId) return null;

    const safePosition = Math.max(0, isNaN(positionSeconds) ? 0 : positionSeconds);
    const safeDuration = Math.max(0, isNaN(durationSeconds) ? 0 : durationSeconds);
    const completionPercent = computeCompletionPercent(safePosition, safeDuration);

    const payload: ListeningEventPayload = {
      songId,
      eventType,
      timestamp: new Date().toISOString(),
      playback: {
        positionSeconds: safePosition,
        durationSeconds: safeDuration,
        completionPercent,
        playbackSpeed: 1.0,
      },
      context: {
        sessionId: getSessionId(),
        timeOfDay: getTimeOfDay(),
        dayOfWeek: getDayOfWeek(),
        deviceType: getDeviceType(),
      },
      ...(metadata ? { metadata } : {}),
    };

    try {
      const response = await apiRequest<ListeningEventResponse>('/listening-events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response;
    } catch (err) {
      // Non-blocking: background tracking errors must never interrupt music playback
      if (import.meta.env.DEV) {
        console.warn(`[ListeningEvent] Non-blocking dispatch failed for (${eventType}):`, err);
      }
      return null;
    }
  },

  recordPlay(
    songId: string,
    positionSeconds = 0,
    durationSeconds = 0,
    metadata?: {
      recommendationRequestId?: string;
      recommendationStrategy?: string;
      recommendationPosition?: number;
    }
  ) {
    return this.sendEvent('play', songId, positionSeconds, durationSeconds, metadata);
  },

  recordPause(
    songId: string,
    positionSeconds: number,
    durationSeconds: number,
    metadata?: {
      recommendationRequestId?: string;
      recommendationStrategy?: string;
      recommendationPosition?: number;
    }
  ) {
    return this.sendEvent('pause', songId, positionSeconds, durationSeconds, metadata);
  },

  recordSkip(
    songId: string,
    positionSeconds: number,
    durationSeconds: number,
    metadata?: {
      recommendationRequestId?: string;
      recommendationStrategy?: string;
      recommendationPosition?: number;
    }
  ) {
    return this.sendEvent('skip', songId, positionSeconds, durationSeconds, metadata);
  },

  recordComplete(
    songId: string,
    durationSeconds: number,
    metadata?: {
      recommendationRequestId?: string;
      recommendationStrategy?: string;
      recommendationPosition?: number;
    }
  ) {
    return this.sendEvent('complete', songId, durationSeconds, durationSeconds, metadata);
  },
};
