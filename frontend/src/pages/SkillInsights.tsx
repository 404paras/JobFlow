import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '../lib/api';
import { useBrowserAI } from '../hooks/useBrowserAI';
import type { Job } from '../lib/types';
import type { SkillGap } from '../services/browserAI';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Lightbulb,
  BarChart3,
  BookOpen,
  Award,
  ChevronRight,
} from 'lucide-react';

interface SkillCategory {
  name: string;
  skills: string[];
  color: string;
  icon: React.ReactNode;
}

export default function SkillInsights() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [marketDemand, setMarketDemand] = useState<Map<string, number>>(new Map());
  const [jobs, setJobs] = useState<Job[]>([]);
  const [hasResume, setHasResume] = useState(false);

  const {
    isLoading: isAILoading,
    isReady: isAIReady,
    progress: aiProgress,
    status: aiStatus,
    initialize: initializeAI,
    analyzeSkillGaps,
    getMarketSkillDemand,
  } = useBrowserAI();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resumeData, jobsResponse] = await Promise.all([
        api.getResume(),
        api.getJobs(1, 100, {}),
      ]);

      if (resumeData) {
        setUserSkills(resumeData.skills);
        setHasResume(true);
      }

      setJobs(jobsResponse.data);
    } catch (error: any) {
      toast.error('Failed to load data', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAnalyze = async () => {
    if (!hasResume) {
      toast.error('No resume uploaded', {
        description: 'Please upload your resume first to analyze skill gaps.',
      });
      return;
    }

    if (jobs.length === 0) {
      toast.error('No jobs available', {
        description: 'Run a workflow to collect jobs before analyzing skills.',
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      if (!isAIReady) {
        toast.info('Loading AI model...', {
          description: 'This may take a moment on first use.',
        });
        await initializeAI();
      }

      const jobDescriptions = jobs.map(j => 
        `${j.title} ${j.company} ${j.description || ''}`
      );

      const gaps = analyzeSkillGaps(userSkills, jobDescriptions);
      const demand = getMarketSkillDemand(jobDescriptions);

      setSkillGaps(gaps);
      setMarketDemand(demand);

      toast.success('Analysis complete!', {
        description: `Found ${gaps.length} skill gaps to address.`,
      });
    } catch (error: any) {
      toast.error('Analysis failed', {
        description: error.message || 'An error occurred during analysis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const categorizeSkills = (): SkillCategory[] => {
    const technical: string[] = [];
    const frameworks: string[] = [];
    const tools: string[] = [];
    const soft: string[] = [];

    const frameworkKeywords = ['react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel'];
    const toolKeywords = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'jira', 'figma'];
    const softKeywords = ['leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving', 'management'];

    for (const skill of userSkills) {
      const lowerSkill = skill.toLowerCase();
      if (frameworkKeywords.some(f => lowerSkill.includes(f))) {
        frameworks.push(skill);
      } else if (toolKeywords.some(t => lowerSkill.includes(t))) {
        tools.push(skill);
      } else if (softKeywords.some(s => lowerSkill.includes(s))) {
        soft.push(skill);
      } else {
        technical.push(skill);
      }
    }

    return [
      { name: 'Technical Skills', skills: technical, color: 'indigo', icon: <Zap size={18} /> },
      { name: 'Frameworks & Libraries', skills: frameworks, color: 'purple', icon: <BookOpen size={18} /> },
      { name: 'Tools & Platforms', skills: tools, color: 'cyan', icon: <Target size={18} /> },
      { name: 'Soft Skills', skills: soft, color: 'emerald', icon: <Award size={18} /> },
    ];
  };

  const getSkillMatchPercentage = (skill: string): number => {
    const demand = marketDemand.get(skill.toLowerCase()) || 0;
    const maxDemand = Math.max(...Array.from(marketDemand.values()), 1);
    return Math.round((demand / maxDemand) * 100);
  };

  const topDemandSkills = Array.from(marketDemand.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const skillCategories = categorizeSkills();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/workflows">
                <Button variant="outline" size="sm" className="rounded-xl">
                  <ArrowLeft size={16} className="mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Skill Insights</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isAILoading || !hasResume}
                className="bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                {isAnalyzing || isAILoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isAILoading ? `${Math.round(aiProgress)}%` : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    Analyze Skills
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="rounded-xl"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : !hasResume ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Brain size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Resume Uploaded</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Upload your resume to see skill insights and gap analysis.
            </p>
            <Link to="/workflows">
              <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl">
                Go to Workflows
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Status Banner */}
            {isAILoading && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Brain size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-100">{aiStatus}</div>
                    <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mt-1">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={18} className="text-green-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Your Skills</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{userSkills.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Jobs Analyzed</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{jobs.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Skill Gaps</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{skillGaps.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-purple-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Market Skills</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{marketDemand.size}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Your Skills */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap size={20} className="text-indigo-600" />
                  Your Skills
                </h2>
                
                {skillCategories.map((category) => (
                  category.skills.length > 0 && (
                    <div key={category.name} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-${category.color}-600`}>{category.icon}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{category.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({category.skills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {category.skills.map((skill) => {
                          const matchPct = getSkillMatchPercentage(skill);
                          return (
                            <span
                              key={skill}
                              className={`px-2 py-1 text-xs font-medium rounded-full transition-all hover:scale-105 ${
                                matchPct >= 50
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}
                              title={`${matchPct}% market demand`}
                            >
                              {skill}
                              {matchPct >= 50 && <span className="ml-1 text-green-600">★</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}

                {userSkills.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No skills extracted yet. Make sure your resume is uploaded.
                  </p>
                )}
              </div>

              {/* Market Demand */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  Market Demand
                </h2>
                
                {topDemandSkills.length > 0 ? (
                  <div className="space-y-3">
                    {topDemandSkills.map(([skill, count]) => {
                      const maxCount = topDemandSkills[0][1];
                      const percentage = Math.round((count / maxCount) * 100);
                      const hasSkill = userSkills.some(s => s.toLowerCase() === skill.toLowerCase());
                      
                      return (
                        <div key={skill} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${hasSkill ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                              {skill}
                              {hasSkill && <CheckCircle size={12} className="inline ml-1" />}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{count} jobs</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                hasSkill ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Click "Analyze Skills" to see market demand.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Skill Gaps */}
            {skillGaps.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Lightbulb size={20} className="text-yellow-600" />
                  Skills to Learn
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    (Based on {jobs.length} job listings)
                  </span>
                </h2>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* High Priority */}
                  <div>
                    <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      High Priority
                    </h3>
                    <div className="space-y-2">
                      {skillGaps.filter(g => g.priority === 'high').slice(0, 7).map((gap) => (
                        <div 
                          key={gap.skill}
                          className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg group hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <span className="text-sm text-red-800 dark:text-red-200">{gap.skill}</span>
                          <span className="text-xs text-red-600 dark:text-red-400">{gap.demandCount} jobs</span>
                        </div>
                      ))}
                      {skillGaps.filter(g => g.priority === 'high').length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No high priority gaps</p>
                      )}
                    </div>
                  </div>

                  {/* Medium Priority */}
                  <div>
                    <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-3 flex items-center gap-1">
                      <TrendingUp size={14} />
                      Medium Priority
                    </h3>
                    <div className="space-y-2">
                      {skillGaps.filter(g => g.priority === 'medium').slice(0, 7).map((gap) => (
                        <div 
                          key={gap.skill}
                          className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg group hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                          <span className="text-sm text-yellow-800 dark:text-yellow-200">{gap.skill}</span>
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">{gap.demandCount} jobs</span>
                        </div>
                      ))}
                      {skillGaps.filter(g => g.priority === 'medium').length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No medium priority gaps</p>
                      )}
                    </div>
                  </div>

                  {/* Low Priority */}
                  <div>
                    <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-3 flex items-center gap-1">
                      <CheckCircle size={14} />
                      Nice to Have
                    </h3>
                    <div className="space-y-2">
                      {skillGaps.filter(g => g.priority === 'low').slice(0, 7).map((gap) => (
                        <div 
                          key={gap.skill}
                          className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <span className="text-sm text-green-800 dark:text-green-200">{gap.skill}</span>
                          <span className="text-xs text-green-600 dark:text-green-400">{gap.demandCount} jobs</span>
                        </div>
                      ))}
                      {skillGaps.filter(g => g.priority === 'low').length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No low priority gaps</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tips Section */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
                <Lightbulb size={20} />
                Tips for Improving Your Profile
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Focus on High-Demand Skills</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Prioritize learning skills that appear in 50%+ of job listings in your target area.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Build Projects</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Create projects using the skills you're learning to demonstrate practical experience.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Get Certified</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Industry certifications (AWS, Google, etc.) can significantly boost your profile.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ChevronRight size={18} className="text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Update Your Resume</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Re-upload your resume after learning new skills to see updated match scores.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

