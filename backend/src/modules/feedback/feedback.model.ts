import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  rating?: number;
  userEmail?: string;
  userId?: mongoose.Types.ObjectId;
  status: 'new' | 'reviewed' | 'resolved';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedbackDocument extends IFeedback, Document {}

const FeedbackSchema = new Schema<IFeedbackDocument>(
  {
    type: {
      type: String,
      enum: ['bug', 'feature', 'improvement', 'other'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    userEmail: {
      type: String,
      lowercase: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved'],
      default: 'new',
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

FeedbackSchema.index({ status: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedbackDocument>('Feedback', FeedbackSchema);
export default Feedback;

