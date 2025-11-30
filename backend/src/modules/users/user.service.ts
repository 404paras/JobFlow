import jwt from 'jsonwebtoken';
import { User, IUserDocument } from './user.model';
import { RegisterInput, LoginInput, UpdateUserInput } from './user.schema';
import { 
  NotFoundError, 
  ConflictError, 
  UnauthorizedError, 
  ValidationError 
} from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export class UserService {
  /**
   * Generate JWT token
   */
  private generateToken(user: IUserDocument): string {
    const payload: AuthTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterInput): Promise<{ user: IUserDocument; token: string }> {
    // Check if user already exists
    const existingUser = await User.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const user = new User({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    await user.save();
    logger.info('User registered', { userId: user._id, email: user.email });

    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Login user
   */
  async login(data: LoginInput): Promise<{ user: IUserDocument; token: string }> {
    // Find user with password
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Compare passwords
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    logger.info('User logged in', { userId: user._id, email: user.email });

    const token = this.generateToken(user);

    return { user, token };
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<IUserDocument> {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserInput): Promise<IUserDocument> {
    const user = await User.findById(id).select('+password');
    if (!user) {
      throw new NotFoundError('User');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.password !== undefined) user.password = data.password;

    await user.save();
    logger.info('User updated', { userId: user._id });

    return user;
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token: string): Promise<IUserDocument> {
    const payload = this.verifyToken(token);
    return this.findById(payload.userId);
  }
}

export const userService = new UserService();
export default userService;

