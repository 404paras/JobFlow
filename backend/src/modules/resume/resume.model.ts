import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IResume {
  userId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'latex' | 'markdown';
  fileSize: number;
  rawText: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  keywords: string[];
  uploadedAt: Date;
  updatedAt: Date;
}

export interface IResumeDocument extends IResume, Document {}

const ResumeSchema = new Schema<IResumeDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt', 'latex', 'markdown'],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    rawText: {
      type: String,
      default: '',
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: [{
      title: String,
      company: String,
      duration: String,
    }],
    education: [{
      degree: String,
      institution: String,
      year: String,
    }],
    keywords: {
      type: [String],
      default: [],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret.rawText;
        return ret;
      },
    },
  }
);

export const Resume: Model<IResumeDocument> = mongoose.model<IResumeDocument>(
  'Resume',
  ResumeSchema
);

export default Resume;

