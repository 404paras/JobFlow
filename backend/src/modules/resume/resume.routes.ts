import { Router, Response } from 'express';
import { resumeService } from './resume.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';
import { authenticate, AuthRequest } from '../users/auth.middleware';
import { logger } from '../../shared/utils/logger';

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

router.post(
  '/upload',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    
    if (!req.body || !req.body.content) {
      res.status(400).json({
        success: false,
        error: 'No file content provided',
      } as ApiResponse);
      return;
    }

    const { content, fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      res.status(400).json({
        success: false,
        error: 'fileName and fileType are required',
      } as ApiResponse);
      return;
    }

    const validTypes = ['pdf', 'docx', 'txt'];
    if (!validTypes.includes(fileType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid file type. Allowed: pdf, docx, txt',
      } as ApiResponse);
      return;
    }

    const textContent = typeof content === 'string' ? content : '';
    if (textContent.length > MAX_FILE_SIZE) {
      res.status(400).json({
        success: false,
        error: 'File too large. Max size: 5MB',
      } as ApiResponse);
      return;
    }

    try {
      const resume = await resumeService.uploadResume(
        userId,
        fileName,
        fileType as 'pdf' | 'docx' | 'txt' | 'latex' | 'markdown',
        textContent.length,
        textContent
      );

      res.json({
        success: true,
        message: 'Resume uploaded and processed successfully',
        data: {
          id: resume._id,
          fileName: resume.fileName,
          skills: resume.skills,
          experience: resume.experience,
          education: resume.education,
          keywords: resume.keywords.slice(0, 10),
          uploadedAt: resume.uploadedAt,
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Failed to process resume', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  })
);

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const resume = await resumeService.getResume(userId);

    if (!resume) {
      res.status(404).json({
        success: false,
        error: 'No resume found. Please upload your resume first.',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: {
        id: resume._id,
        fileName: resume.fileName,
        fileType: resume.fileType,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        keywords: resume.keywords.slice(0, 10),
        uploadedAt: resume.uploadedAt,
      },
    } as ApiResponse);
  })
);

router.delete(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const deleted = await resumeService.deleteResume(userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'No resume found to delete',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Resume deleted successfully',
    } as ApiResponse);
  })
);

router.get(
  '/skills',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const resume = await resumeService.getResume(userId);

    if (!resume) {
      res.status(404).json({
        success: false,
        error: 'No resume found. Please upload your resume first.',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: {
        skills: resume.skills,
        keywords: resume.keywords,
      },
    } as ApiResponse);
  })
);

router.post(
  '/match',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { jobDescription } = req.body;

    if (!jobDescription) {
      res.status(400).json({
        success: false,
        error: 'jobDescription is required',
      } as ApiResponse);
      return;
    }

    const resume = await resumeService.getResume(userId);

    if (!resume) {
      res.status(404).json({
        success: false,
        error: 'No resume found. Please upload your resume first.',
      } as ApiResponse);
      return;
    }

    const matchScore = resumeService.calculateJobMatchScore(resume.skills, jobDescription);

    res.json({
      success: true,
      data: {
        matchScore,
        matchedSkills: resume.skills.filter(skill => 
          jobDescription.toLowerCase().includes(skill.toLowerCase())
        ),
        totalSkills: resume.skills.length,
      },
    } as ApiResponse);
  })
);

export default router;

