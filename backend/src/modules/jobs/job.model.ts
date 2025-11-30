import mongoose, { Document, Schema, Model } from 'mongoose';
import { JobSource } from '../../shared/types';

// ============================================
// Interface
// ============================================

export interface IJobListing {
  uid: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  postedAt: Date;
  description: string;
  url: string;
  source: JobSource;
  raw?: Record<string, any>;
  workflowId: string;
  normalized: boolean;
  filtered: boolean;
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobListingDocument extends IJobListing, Document {}

// ============================================
// Schema
// ============================================

const JobListingSchema = new Schema<IJobListingDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    company: {
      type: String,
      required: true,
      trim: true,
      index: 'text',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
    },
    postedAt: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['linkedin', 'indeed', 'naukri'],
      required: true,
      index: true,
    },
    raw: {
      type: Schema.Types.Mixed,
    },
    workflowId: {
      type: String,
      required: true,
      index: true,
    },
    normalized: {
      type: Boolean,
      default: false,
    },
    filtered: {
      type: Boolean,
      default: false,
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
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

JobListingSchema.index({ workflowId: 1, source: 1 });
JobListingSchema.index({ workflowId: 1, createdAt: -1 });
JobListingSchema.index({ title: 'text', company: 'text', description: 'text' });

// ============================================
// Static Methods
// ============================================

JobListingSchema.statics.findByWorkflowId = function (workflowId: string) {
  return this.find({ workflowId }).sort({ postedAt: -1 });
};

JobListingSchema.statics.findBySource = function (source: JobSource) {
  return this.find({ source }).sort({ postedAt: -1 });
};

JobListingSchema.statics.deleteByWorkflowId = function (workflowId: string) {
  return this.deleteMany({ workflowId });
};

// ============================================
// Export
// ============================================

export const JobListing: Model<IJobListingDocument> = mongoose.model<IJobListingDocument>(
  'JobListing',
  JobListingSchema
);

export default JobListing;

