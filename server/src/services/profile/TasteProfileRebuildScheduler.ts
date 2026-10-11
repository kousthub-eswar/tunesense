import { userTasteProfileService } from './UserTasteProfileService.js';
import { collaborativeService } from '../recommendation/CollaborativeService.js';

interface UserRebuildState {
  lastRebuildAt: number;
  inFlight: boolean;
  pending: boolean;
  timer?: NodeJS.Timeout;
}

/**
 * TasteProfileRebuildScheduler
 *
 * Implements throttled, coalesced, asynchronous taste-profile rebuilding.
 * - Only 'complete' and 'skip' listening events trigger rebuilds (ignoring play, pause, seek).
 * - Coalesces repeated triggers so rebuilds occur no more frequently than once per minute per user.
 * - Executes out of the synchronous request path to eliminate request latency spikes.
 * - Prevents concurrent rebuilds for the same user.
 * - Preserves event persistence regardless of rebuild outcome.
 */
export class TasteProfileRebuildScheduler {
  private readonly states = new Map<string, UserRebuildState>();
  public throttleMs = 60_000; // 1 minute throttle window

  constructor() {
    // Clean up idle user states every 5 minutes to prevent unbounded memory growth
    setInterval(() => {
      const now = Date.now();
      for (const [userId, state] of this.states.entries()) {
        if (!state.inFlight && !state.pending && now - state.lastRebuildAt > 300_000) {
          if (state.timer) clearTimeout(state.timer);
          this.states.delete(userId);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  /**
   * Only 'complete' and 'skip' listening events are eligible to trigger a taste profile rebuild.
   */
  public isEventEligible(eventType: string): boolean {
    return eventType === 'complete' || eventType === 'skip';
  }

  /**
   * Pluggable profile rebuild runner (defaults to UserTasteProfileService + CollaborativeService)
   */
  public rebuildFn: (userId: string) => Promise<void> = async (userId: string) => {
    await userTasteProfileService.rebuildProfile(userId);
    await collaborativeService.invalidateSimilarityCache(userId);
  };

  /**
   * Schedules an asynchronous, throttled, and coalesced taste profile rebuild for the user.
   * Keeps profile rebuilding out of the synchronous listening event request path.
   */
  public scheduleRebuild(userId: string): void {
    let state = this.states.get(userId);
    if (!state) {
      state = {
        lastRebuildAt: 0,
        inFlight: false,
        pending: false,
      };
      this.states.set(userId, state);
    }

    // If a rebuild is already in-flight for this user, mark pending so it runs upon completion
    if (state.inFlight) {
      state.pending = true;
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - state.lastRebuildAt;

    if (timeSinceLast >= this.throttleMs) {
      // Throttle window has passed: mark inFlight immediately and defer execution out of request path
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = undefined;
      }
      state.inFlight = true;
      state.pending = false;
      setImmediate(() => {
        this.executeRebuild(userId);
      });
    } else {
      // Within throttle window: coalesce!
      state.pending = true;
      if (!state.timer) {
        const delay = this.throttleMs - timeSinceLast;
        state.timer = setTimeout(() => {
          const s = this.states.get(userId);
          if (s) {
            s.timer = undefined;
            if (s.pending && !s.inFlight) {
              s.inFlight = true;
              s.pending = false;
              this.executeRebuild(userId);
            }
          }
        }, delay);
        state.timer.unref();
      }
    }
  }

  /**
   * Executes the rebuild asynchronously, managing in-flight state and triggering any coalesced follow-up.
   */
  public async executeRebuild(userId: string): Promise<void> {
    const state = this.states.get(userId);
    if (!state) return;

    try {
      await this.rebuildFn(userId);
    } catch (err) {
      console.warn(`[TasteProfileRebuildScheduler] Background taste profile rebuild notice for ${userId}:`, err);
    } finally {
      state.inFlight = false;
      state.lastRebuildAt = Date.now();

      // If another eligible event arrived during this rebuild, schedule the follow-up after throttle
      if (state.pending) {
        if (!state.timer) {
          state.timer = setTimeout(() => {
            const s = this.states.get(userId);
            if (s) {
              s.timer = undefined;
              if (s.pending && !s.inFlight) {
                s.inFlight = true;
                s.pending = false;
                this.executeRebuild(userId);
              }
            }
          }, this.throttleMs);
          state.timer.unref();
        }
      }
    }
  }

  public isRebuilding(userId: string): boolean {
    return Boolean(this.states.get(userId)?.inFlight);
  }

  public isPending(userId: string): boolean {
    return Boolean(this.states.get(userId)?.pending);
  }

  public clear(): void {
    for (const state of this.states.values()) {
      if (state.timer) clearTimeout(state.timer);
    }
    this.states.clear();
  }
}

export const tasteProfileRebuildScheduler = new TasteProfileRebuildScheduler();
