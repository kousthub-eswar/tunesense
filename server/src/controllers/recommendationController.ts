import { Request, Response } from 'express';
import { recommendationEngine } from '../services/recommendation/RecommendationEngine.js';
import { RecommendationStrategyType } from '../services/recommendation/types.js';

const ALLOWED_STRATEGIES: readonly RecommendationStrategyType[] = [
  'popularity',
  'content',
  'behaviour',
  'context',
  'hybrid',
  'collaborative',
  'collaborativeHybrid',
];

/**
 * Controller for retrieving personalized recommendations for the authenticated user.
 * GET /api/recommendations
 */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to receive personalized recommendations',
        },
      });
      return;
    }

    // Anti-Spoofing Security Validation:
    // Reject any query or body that attempts to request recommendations for another user ID
    const requestedUserId = req.query.userId as string | undefined;
    if (requestedUserId && requestedUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: You cannot view recommendations for another user',
        },
      });
      return;
    }

    // Parse and validate query parameters
    let limit = 10;
    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 20) {
        limit = parsedLimit;
      }
    }

    let strategy: RecommendationStrategyType = 'hybrid';
    if (req.query.strategy) {
      const raw = (req.query.strategy as string).trim();
      const lower = raw.toLowerCase();
      const matched = ALLOWED_STRATEGIES.find((s) => s.toLowerCase() === lower);
      if (matched) {
        strategy = matched;
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STRATEGY',
            message: `Strategy '${req.query.strategy}' is not supported. Allowed: ${ALLOWED_STRATEGIES.join(', ')}`,
          },
        });
        return;
      }
    }

    let mood: string | undefined;
    if (req.query.mood) {
      const requestedMood = (req.query.mood as string).toLowerCase().trim();
      if (requestedMood) {
        mood = requestedMood;
      }
    }

    const result = await recommendationEngine.getRecommendations(authenticatedUserId, {
      limit,
      strategy,
      mood,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[recommendationController] Error generating recommendations:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATION_ERROR',
        message: 'An error occurred while generating recommendations',
      },
    });
  }
}
