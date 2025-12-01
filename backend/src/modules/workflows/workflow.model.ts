import mongoose, { Document, Schema, Model } from 'mongoose';
import { WorkflowStatus, WorkflowNode, WorkflowEdge, JobsConfig } from '../../shared/types';

export interface IWorkflow {
  workflowId: string;
  title: string;
  status: WorkflowStatus;
  userId?: mongoose.Types.ObjectId | string;
  userEmail?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeCount: number;
  jobsConfig?: JobsConfig;
  isActive: boolean;
  activatedAt?: Date;
  deactivatesAt?: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowDocument extends IWorkflow, Document {}

const WorkflowNodeSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: {
    label: { type: String, required: true },
    type: { type: String, required: true },
    jobType: { type: String },
    filterCount: { type: Number },
    metadata: { type: Schema.Types.Mixed },
  },
}, { _id: false });

const WorkflowEdgeSchema = new Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceHandle: { type: String },
  targetHandle: { type: String },
}, { _id: false });

const JobsConfigSchema = new Schema({
  retentionDays: { type: Number, default: 30, min: 7, max: 90 },
  maxJobs: { type: Number, default: 100, min: -1, max: 500 },
  notifications: { type: Boolean, default: true },
  notifyThreshold: { type: Number, default: 1, min: 1, max: 50 },
  defaultSort: { 
    type: String, 
    enum: ['newest', 'match', 'company'],
    default: 'newest',
  },
  autoMarkReadDays: { type: Number, default: 0, min: 0, max: 7 },
}, { _id: false });

const WorkflowSchema = new Schema<IWorkflowDocument>(
  {
    workflowId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'paused'],
      default: 'draft',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    nodes: {
      type: [WorkflowNodeSchema],
      default: [],
    },
    edges: {
      type: [WorkflowEdgeSchema],
      default: [],
    },
    nodeCount: {
      type: Number,
      default: 0,
    },
    jobsConfig: {
      type: JobsConfigSchema,
      default: () => ({
        retentionDays: 30,
        maxJobs: 100,
        notifications: true,
        notifyThreshold: 1,
        defaultSort: 'newest',
        autoMarkReadDays: 0,
      }),
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    activatedAt: {
      type: Date,
    },
    deactivatesAt: {
      type: Date,
      index: true,
    },
    lastExecutedAt: {
      type: Date,
    },
    executionCount: {
      type: Number,
      default: 0,
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

WorkflowSchema.index({ userId: 1, status: 1 });
WorkflowSchema.index({ userId: 1, isActive: 1 });
WorkflowSchema.index({ isActive: 1, deactivatesAt: 1 });
WorkflowSchema.index({ createdAt: -1 });

WorkflowSchema.pre('save', function () {
  this.nodeCount = this.nodes.length;
});

WorkflowSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

WorkflowSchema.statics.findPublished = function () {
  return this.find({ status: 'published' });
};

WorkflowSchema.statics.findActiveWorkflows = function () {
  return this.find({
    status: 'published',
    isActive: true,
  });
};

WorkflowSchema.statics.findActiveWorkflowByUser = function (userId: string) {
  return this.findOne({ userId, isActive: true });
};

WorkflowSchema.statics.deactivateExpiredWorkflows = async function () {
  const now = new Date();
  const result = await this.updateMany(
    { isActive: true, deactivatesAt: { $lte: now } },
    { $set: { isActive: false }, $unset: { activatedAt: 1, deactivatesAt: 1 } }
  );
  return result.modifiedCount;
};

export const Workflow: Model<IWorkflowDocument> = mongoose.model<IWorkflowDocument>(
  'Workflow',
  WorkflowSchema
);

export default Workflow;
