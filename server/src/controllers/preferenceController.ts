import { Request, Response } from 'express';
import { userPreferenceService } from '../services/preference/UserPreferenceService.js';
import { updatePreferencesSchema } from '../validators/preferenceValidator.js';
import { ZodError } from 'zod';

/**
 * GET /api/preferences
 * Retrieves explicit music preferences and personalization settings for the authenticated user.
 */
export async function getPreferences(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access user preferences',
        },
      });
      return;
    }

    // Anti-spoofing validation
    const queryUserId = req.query.userId as string | undefined;
    if (queryUserId && queryUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: You cannot view preferences for another user',
        },
      });
      return;
    }

    const preferences = await userPreferenceService.getPreferences(authenticatedUserId);

    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (err: any) {
    console.error('[preferenceController] Error retrieving preferences:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve preferences',
      },
    });
  }
}

/**
 * PUT /api/preferences
 * Updates explicit music preferences and personalization settings for the authenticated user.
 */
export async function updatePreferences(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to update user preferences',
        },
      });
      return;
    }

    // Anti-spoofing validation
    const targetUserId = (req.body?.userId || req.query.userId) as string | undefined;
    if (targetUserId && targetUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_USER_ACCESS',
          message: 'Access denied: You cannot modify preferences for another user',
        },
      });
      return;
    }

    // Validate body
    const validatedData = updatePreferencesSchema.parse(req.body);

    const updated = await userPreferenceService.updatePreferences(
      authenticatedUserId,
      validatedData
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid preference update payload',
          details: err.errors,
        },
      });
      return;
    }

    console.error('[preferenceController] Error updating preferences:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update preferences',
      },
    });
  }
}
