import mongoose, { Document, Schema, Model } from 'mongoose';
import { WorkflowStatus, WorkflowNode, WorkflowEdge, EmailConfig } from '../../shared/types';

// ============================================
// Interface
// ============================================

export interface IWorkflow {
  workflowId: string;
  title: string;
  status: WorkflowStatus;
  userId?: mongoose.Types.ObjectId | string;
  userEmail?: string; // Denormalized for easy access
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeCount: number;
  emailConfig?: EmailConfig;
  lastExecutedAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowDocument extends IWorkflow, Document {}

// ============================================
// Schema
// ============================================

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

const EmailConfigSchema = new Schema({
  recipients: { type: String, required: true },
  schedule: { 
    type: String, 
    enum: ['daily-9am', 'daily-6pm', 'weekly'],
    default: 'daily-9am',
  },
  format: { 
    type: String, 
    enum: ['html', 'plain', 'pdf'],
    default: 'html',
  },
  lastSentAt: { type: Date },
  sentCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  pausedAt: { type: Date },
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
    emailConfig: {
      type: EmailConfigSchema,
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

// ============================================
// Indexes
// ============================================

WorkflowSchema.index({ userId: 1, status: 1 });
WorkflowSchema.index({ status: 1, 'emailConfig.isActive': 1 });
WorkflowSchema.index({ createdAt: -1 });

// ============================================
// Middleware
// ============================================

WorkflowSchema.pre('save', function () {
  this.nodeCount = this.nodes.length;
});

// ============================================
// Static Methods
// ============================================

WorkflowSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId }).sort({ updatedAt: -1 });
};

WorkflowSchema.statics.findPublished = function () {
  return this.find({ status: 'published' });
};

WorkflowSchema.statics.findActiveEmailWorkflows = function () {
  return this.find({
    status: 'published',
    'emailConfig.isActive': true,
  });
};

// ============================================
// Export
// ============================================

export const Workflow: Model<IWorkflowDocument> = mongoose.model<IWorkflowDocument>(
  'Workflow',
  WorkflowSchema
);

export default Workflow;

