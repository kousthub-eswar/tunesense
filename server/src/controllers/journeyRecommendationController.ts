import { Request, Response } from 'express';
import { journeyRecommendationSchema } from '../validators/journeyValidators.js';
import { journeyRecommendationService } from '../services/recommendation/JourneyRecommendationService.js';

/**
 * Controller: Emotional GPS Journey Recommendations
 * POST /api/recommendations/journey
 */
export async function getJourneyRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = journeyRecommendationSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid journey parameters. fromMood and toMood must be valid mood identifiers.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { fromMood, toMood, steps } = parseResult.data;

    const result = await journeyRecommendationService.planJourney({
      fromMood,
      toMood,
      steps,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[journeyRecommendationController] Error planning journey:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'JOURNEY_RECOMMENDATION_ERROR',
        message: err.message || 'Failed to plan emotional GPS journey.',
      },
    });
  }
}
