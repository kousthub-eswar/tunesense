import { Schema, model, Model, Types } from 'mongoose';

export interface ICounterfactualExperimentLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  experimentId: string;
  algorithmVersion: string;
  timestamp: Date;
  candidateCount: number;
  baselineWeights: {
    content: number;
    behaviour: number;
    context: number;
    collaborative: number;
    popularity: number;
    novelty: number;
    mood?: number;
  };
  counterfactualWeights: {
    content: number;
    behaviour: number;
    context: number;
    collaborative: number;
    popularity: number;
    novelty: number;
    mood?: number;
  };
  baselineContext: {
    timeOfDay: string;
    dayOfWeek: string;
    mood?: string;
  };
  counterfactualContext: {
    timeOfDay: string;
    dayOfWeek: string;
    mood?: string;
  };
  metrics: {
    k: number;
    topKOverlapCount: number;
    rankBiasedOverlap: number;
    meanRankDisplacement: number;
    maxRankDisplacement: number;
    enteredTopKCount: number;
    leftTopKCount: number;
    isIdentical: boolean;
  };
  isSimulation: boolean;
  userOptedInToProfileUpdate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const counterfactualExperimentLogSchema = new Schema<ICounterfactualExperimentLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    experimentId: {
      type: String,
      required: [true, 'Experiment ID is required'],
      unique: true,
      index: true,
    },
    algorithmVersion: {
      type: String,
      default: '1.0.0',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    candidateCount: {
      type: Number,
      required: true,
      min: 0,
    },
    baselineWeights: {
      content: { type: Number, required: true },
      behaviour: { type: Number, required: true },
      context: { type: Number, required: true },
      collaborative: { type: Number, required: true },
      popularity: { type: Number, required: true },
      novelty: { type: Number, required: true },
      mood: { type: Number, default: 0 },
    },
    counterfactualWeights: {
      content: { type: Number, required: true },
      behaviour: { type: Number, required: true },
      context: { type: Number, required: true },
      collaborative: { type: Number, required: true },
      popularity: { type: Number, required: true },
      novelty: { type: Number, required: true },
      mood: { type: Number, default: 0 },
    },
    baselineContext: {
      timeOfDay: { type: String, required: true },
      dayOfWeek: { type: String, required: true },
      mood: { type: String, default: undefined },
    },
    counterfactualContext: {
      timeOfDay: { type: String, required: true },
      dayOfWeek: { type: String, required: true },
      mood: { type: String, default: undefined },
    },
    metrics: {
      k: { type: Number, default: 10 },
      topKOverlapCount: { type: Number, default: 0 },
      rankBiasedOverlap: { type: Number, default: 1.0 },
      meanRankDisplacement: { type: Number, default: 0 },
      maxRankDisplacement: { type: Number, default: 0 },
      enteredTopKCount: { type: Number, default: 0 },
      leftTopKCount: { type: Number, default: 0 },
      isIdentical: { type: Boolean, default: true },
    },
    isSimulation: {
      type: Boolean,
      default: true,
      immutable: true,
    },
    userOptedInToProfileUpdate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

counterfactualExperimentLogSchema.index({ userId: 1, timestamp: -1 });

export const CounterfactualExperimentLog: Model<ICounterfactualExperimentLog> =
  model<ICounterfactualExperimentLog>(
    'CounterfactualExperimentLog',
    counterfactualExperimentLogSchema
  );
