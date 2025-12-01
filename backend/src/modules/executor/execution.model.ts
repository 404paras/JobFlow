import mongoose, { Document, Schema, Model } from 'mongoose';
import { ExecutionStatus, ExecutionLog } from '../../shared/types';

export interface IExecution {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  nodeLogs: ExecutionLog[];
  jobsScraped: number;
  jobsFiltered: number;
  jobsSaved: number;
  error?: string;
  triggeredBy: 'schedule' | 'manual' | 'api';
  createdAt: Date;
  updatedAt: Date;
}

export interface IExecutionDocument extends IExecution, Document {}

const NodeLogSchema = new Schema({
  nodeId: { type: String, required: true },
  nodeType: { 
    type: String, 
    enum: ['trigger', 'job-source', 'normalize-data', 'filter', 'jobs-output'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  inputCount: { type: Number, default: 0 },
  outputCount: { type: Number, default: 0 },
  error: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

const ExecutionSchema = new Schema<IExecutionDocument>(
  {
    executionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    workflowId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: { type: Date },
    duration: { type: Number },
    nodeLogs: {
      type: [NodeLogSchema],
      default: [],
    },
    jobsScraped: { type: Number, default: 0 },
    jobsFiltered: { type: Number, default: 0 },
    jobsSaved: { type: Number, default: 0 },
    error: { type: String },
    triggeredBy: {
      type: String,
      enum: ['schedule', 'manual', 'api'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

ExecutionSchema.index({ workflowId: 1, startedAt: -1 });
ExecutionSchema.index({ status: 1, startedAt: -1 });

ExecutionSchema.methods.complete = function (this: IExecutionDocument) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  return this.save();
};

ExecutionSchema.methods.fail = function (this: IExecutionDocument, error: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  this.error = error;
  return this.save();
};

ExecutionSchema.statics.findByWorkflowId = function (workflowId: string, limit = 10) {
  return this.find({ workflowId }).sort({ startedAt: -1 }).limit(limit);
};

ExecutionSchema.statics.getLatestExecution = function (workflowId: string) {
  return this.findOne({ workflowId }).sort({ startedAt: -1 });
};

export const Execution: Model<IExecutionDocument> = mongoose.model<IExecutionDocument>(
  'Execution',
  ExecutionSchema
);

export default Execution;
