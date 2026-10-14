import { Request, Response } from 'express';
import { vibeRecommendationService } from '../services/recommendation/VibeRecommendationService.js';
import { vibeRecommendationSchema } from '../validators/vibeValidators.js';

/**
 * Controller: Recommendations by Visual Photo Vibe
 * POST /api/recommendations/by-vibe
 */
export async function getRecommendationsByVibe(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const parseResult = vibeRecommendationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid vibe features provided. Energy, valence, and danceability must be numbers between 0 and 1.',
          details: parseResult.error.format(),
        },
      });
      return;
    }

    const { energy, valence, danceability, limit } = parseResult.data;

    const result = await vibeRecommendationService.getRecommendationsByVibe({
      energy,
      valence,
      danceability,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[vibeRecommendationController] Error generating recommendations by vibe:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'VIBE_RECOMMENDATION_ERROR',
        message: err.message || 'Failed to generate recommendations matching image vibe.',
      },
    });
  }
}
