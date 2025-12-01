import { useState, useCallback } from 'react';
import { browserAI } from '../services/browserAI';
import type { MatchResult, ResumeData, SkillGap } from '../services/browserAI';

interface AIState {
  isLoading: boolean;
  isReady: boolean;
  progress: number;
  status: string;
  error: string | null;
}

export function useBrowserAI() {
  const [state, setState] = useState<AIState>({
    isLoading: false,
    isReady: browserAI.isReady(),
    progress: 0,
    status: '',
    error: null,
  });

  const initialize = useCallback(async () => {
    if (browserAI.isReady()) {
      setState(prev => ({ ...prev, isReady: true }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await browserAI.initialize((progress, status) => {
        setState(prev => ({ ...prev, progress, status }));
      });
      setState(prev => ({ ...prev, isLoading: false, isReady: true }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize AI',
      }));
    }
  }, []);

  const calculateMatchScore = useCallback(
    async (resumeText: string, jobDescription: string, resumeSkills?: string[]): Promise<MatchResult | null> => {
      try {
        return await browserAI.calculateMatchScore(resumeText, jobDescription, resumeSkills);
      } catch (error) {
        console.error('Match calculation failed:', error);
        return null;
      }
    },
    []
  );

  const batchCalculateMatchScores = useCallback(
    async (
      resumeText: string,
      jobs: { id: string; description: string }[],
      onProgress?: (current: number, total: number) => void
    ): Promise<Map<string, MatchResult>> => {
      return browserAI.batchCalculateMatchScores(resumeText, jobs, onProgress);
    },
    []
  );

  const parseResume = useCallback((text: string): ResumeData => {
    return browserAI.parseResume(text);
  }, []);

  const extractSkills = useCallback((text: string) => {
    return browserAI.extractSkills(text);
  }, []);

  const analyzeSkillGaps = useCallback(
    (userSkills: string[], jobDescriptions: string[]): SkillGap[] => {
      return browserAI.analyzeSkillGaps(userSkills, jobDescriptions);
    },
    []
  );

  const getMarketSkillDemand = useCallback((jobDescriptions: string[]): Map<string, number> => {
    return browserAI.getMarketSkillDemand(jobDescriptions);
  }, []);

  return {
    ...state,
    initialize,
    calculateMatchScore,
    batchCalculateMatchScores,
    parseResume,
    extractSkills,
    analyzeSkillGaps,
    getMarketSkillDemand,
  };
}

export default useBrowserAI;

