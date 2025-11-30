import { Request, Response } from 'express';
import { userService } from './user.service';
import { RegisterInput, LoginInput, UpdateUserInput } from './user.schema';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';

export class UserController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = req.body as RegisterInput;

    const { user, token } = await userService.register(data);

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    };

    res.status(201).json(response);
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = req.body as LoginInput;

    const { user, token } = await userService.login(data);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    };

    res.json(response);
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;

    const user = await userService.findById(userId);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  });

  /**
   * Update current user
   * PUT /api/auth/me
   */
  updateCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId;
    const data = req.body as UpdateUserInput;

    const user = await userService.update(userId, data);

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: user,
    };

    res.json(response);
  });

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Token-based auth - logout is handled client-side
    // This endpoint just confirms the logout action

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    res.json(response);
  });
}

export const userController = new UserController();
export default userController;

