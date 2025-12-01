import mongoose, { Document, Schema, Model } from 'mongoose';
import { JobSource } from '../../shared/types';

export type ApplicationStatus = 'none' | 'applied' | 'interview' | 'offer' | 'rejected';

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
  userId: mongoose.Types.ObjectId;
  normalized: boolean;
  filtered: boolean;
  qualityScore?: number;
  isUnread: boolean;
  viewedAt?: Date;
  isBookmarked: boolean;
  applicationStatus: ApplicationStatus;
  appliedAt?: Date;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobListingDocument extends IJobListing, Document {}

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
    },
    company: {
      type: String,
      required: true,
      trim: true,
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
      enum: ['linkedin', 'naukri', 'remoteok'],
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    isUnread: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewedAt: {
      type: Date,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
      index: true,
    },
    applicationStatus: {
      type: String,
      enum: ['none', 'applied', 'interview', 'offer', 'rejected'],
      default: 'none',
      index: true,
    },
    appliedAt: {
      type: Date,
    },
    matchScore: {
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

JobListingSchema.index({ userId: 1, createdAt: -1 });
JobListingSchema.index({ userId: 1, isUnread: 1 });
JobListingSchema.index({ userId: 1, isBookmarked: 1 });
JobListingSchema.index({ userId: 1, applicationStatus: 1 });
JobListingSchema.index({ userId: 1, source: 1 });
JobListingSchema.index({ workflowId: 1, source: 1 });
JobListingSchema.index({ workflowId: 1, createdAt: -1 });
JobListingSchema.index({ title: 'text', company: 'text', description: 'text' });

JobListingSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { isBookmarked: false }
  }
);

JobListingSchema.statics.findByWorkflowId = function (workflowId: string) {
  return this.find({ workflowId }).sort({ postedAt: -1 });
};

JobListingSchema.statics.findBySource = function (source: JobSource) {
  return this.find({ source }).sort({ postedAt: -1 });
};

JobListingSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

JobListingSchema.statics.deleteByWorkflowId = function (workflowId: string) {
  return this.deleteMany({ workflowId });
};

JobListingSchema.statics.getNewJobsCount = function (userId: string) {
  return this.countDocuments({ userId, isUnread: true });
};

export const JobListing: Model<IJobListingDocument> = mongoose.model<IJobListingDocument>(
  'JobListing',
  JobListingSchema
);

export default JobListing;
