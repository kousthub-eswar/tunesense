import { Schema, model, Model } from 'mongoose';
import { IEvaluationFeedback } from '../types/index.js';

const evaluationFeedbackSchema = new Schema<IEvaluationFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    recommendationRequestId: {
      type: String,
      required: [true, 'Recommendation request ID is required'],
      trim: true,
    },
    feedbackType: {
      type: String,
      required: [true, 'Feedback type is required'],
      enum: ['mood', 'explanation'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    mood: {
      type: String,
      trim: true,
      default: undefined,
    },
    songId: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    explanationText: {
      type: String,
      trim: true,
      maxlength: 500,
      default: undefined,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index Strategy:
// 1. userId + timestamp: Fetching user feedback history.
evaluationFeedbackSchema.index({ userId: 1, timestamp: -1 });

// 2. recommendationRequestId: Correlating feedback with specific recommendation sessions.
evaluationFeedbackSchema.index({ recommendationRequestId: 1 });

// 3. feedbackType + mood: Fast aggregation for average mood rating per mood type.
evaluationFeedbackSchema.index({ feedbackType: 1, mood: 1 });

export const EvaluationFeedback: Model<IEvaluationFeedback> =
  model<IEvaluationFeedback>('EvaluationFeedback', evaluationFeedbackSchema);
