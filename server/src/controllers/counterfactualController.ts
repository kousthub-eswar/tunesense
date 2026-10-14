import { Request, Response } from 'express';
import { counterfactualEngine } from '../services/recommendation/CounterfactualEngine.js';
import {
  counterfactualSimulationSchema,
  minimalChangeRecourseSchema,
} from '../validators/counterfactualValidators.js';
import { UserPreference } from '../models/UserPreference.js';
import { Types } from 'mongoose';
import { getDatabaseState } from '../config/database.js';

/**
 * Controller: Run a Counterfactual What-If Recommendation Simulation
 * POST /api/recommendations/counterfactual
 */
export async function runCounterfactualSimulation(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access the What-If Recommendation Lab',
        },
      });
      return;
    }

    // Input Validation using Zod
    const validationResult = counterfactualSimulationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid counterfactual simulation payload',
          details: validationResult.error.format(),
        },
      });
      return;
    }

    const payload = validationResult.data;

    const result = await counterfactualEngine.simulateCounterfactual(
      authenticatedUserId,
      payload
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[counterfactualController] Error in counterfactual simulation:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'SIMULATION_ERROR',
        message: err.message || 'An error occurred during counterfactual recommendation simulation',
      },
    });
  }
}

/**
 * Controller: Minimal-Change Counterfactual Recourse Search
 * POST /api/recommendations/counterfactual/recourse
 */
export async function findMinimalChangeRecourse(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for counterfactual recourse query',
        },
      });
      return;
    }

    const validationResult = minimalChangeRecourseSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid recourse query payload',
          details: validationResult.error.format(),
        },
      });
      return;
    }

    const { targetSongId, targetRank, applyDiversity, mood } = validationResult.data;

    // Run simulation targeting this specific song
    const simulation = await counterfactualEngine.simulateCounterfactual(
      authenticatedUserId,
      {
        targetSongId,
        targetRank,
        applyDiversity,
        mood,
      }
    );

    if (!simulation.recourseResult) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RECOURSE_NOT_FOUND',
          message: 'Unable to evaluate recourse for target track in current candidate set.',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: simulation.recourseResult,
    });
  } catch (err: any) {
    console.error('[counterfactualController] Error finding minimal recourse:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOURSE_ERROR',
        message: err.message || 'Failed to calculate minimal change recourse',
      },
    });
  }
}

/**
 * Controller: Explicit User Opt-In to Apply Lab Preferences
 * POST /api/recommendations/counterfactual/apply-preferences
 * Only alters permanent profile if the user explicitly triggers this action.
 */
export async function applyCounterfactualPreferences(req: Request, res: Response): Promise<void> {
  try {
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to update preferences',
        },
      });
      return;
    }

    const { explorationLevel, diversityLevel, preferredMood } = req.body;

    const dbState = getDatabaseState();
    if (!dbState.isConnected) {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database is disconnected. Preferences cannot be updated in degraded mode.',
        },
      });
      return;
    }

    const updateFields: any = {};
    if (typeof explorationLevel === 'number') {
      updateFields['personalizationSettings.explorationLevel'] = Math.max(0, Math.min(1, explorationLevel));
    }
    if (typeof diversityLevel === 'number') {
      updateFields['personalizationSettings.diversityLevel'] = Math.max(0, Math.min(1, diversityLevel));
    }
    if (typeof preferredMood === 'string' && preferredMood.trim()) {
      updateFields.preferredMood = preferredMood.trim().toLowerCase();
    }

    const updated = await UserPreference.findOneAndUpdate(
      { userId: new Types.ObjectId(authenticatedUserId) },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: {
        message: 'Personalization settings updated successfully from What-If Lab.',
        preferences: updated,
      },
    });
  } catch (err: any) {
    console.error('[counterfactualController] Error updating preferences from lab:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update preferences from What-If Lab',
      },
    });
  }
}
