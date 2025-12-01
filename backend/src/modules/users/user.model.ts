import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';

// ============================================
// Interface
// ============================================

export interface IUser {
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  isAdmin: boolean;
  lastLoginAt?: Date;
  workflows: mongoose.Types.ObjectId[];
  workflowCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  addWorkflow(workflowId: mongoose.Types.ObjectId): Promise<void>;
  removeWorkflow(workflowId: mongoose.Types.ObjectId): Promise<void>;
}

export interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
}

// ============================================
// Schema
// ============================================

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    workflows: [{
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
    }],
    workflowCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================
// Middleware
// ============================================

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================
// Methods
// ============================================

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

UserSchema.methods.addWorkflow = async function (workflowObjectId: mongoose.Types.ObjectId): Promise<void> {
  const exists = this.workflows.some((id: mongoose.Types.ObjectId) => id.equals(workflowObjectId));
  if (!exists) {
    this.workflows.push(workflowObjectId);
    this.workflowCount = this.workflows.length;
    await this.save();
  }
};

UserSchema.methods.removeWorkflow = async function (workflowObjectId: mongoose.Types.ObjectId): Promise<void> {
  this.workflows = this.workflows.filter((id: mongoose.Types.ObjectId) => !id.equals(workflowObjectId));
  this.workflowCount = this.workflows.length;
  await this.save();
};

// ============================================
// Static Methods
// ============================================

UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// ============================================
// Export
// ============================================

export const User: IUserModel = mongoose.model<IUserDocument, IUserModel>(
  'User',
  UserSchema
);

export default User;

