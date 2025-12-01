import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { useBrowserAI } from '../hooks/useBrowserAI';
import type { Job, JobFilters, JobCounts, ApplicationStatus, JobSource } from '../lib/types';
import type { MatchResult } from '../services/browserAI';
import { toast } from 'sonner';
import {
  Briefcase,
  MapPin,
  Building2,
  Clock,
  Star,
  StarOff,
  ExternalLink,
  Search,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Trash2,
  Brain,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const SOURCE_COLORS: Record<JobSource, string> = {
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  naukri: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  remoteok: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  arbeitnow: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  jobicy: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  interview: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  none: 'Not Applied',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export default function MyJobs() {
  useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts>({ total: 0, new: 0, bookmarked: 0, applied: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<JobFilters>({
    sortBy: 'postedAt',
    sortOrder: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [expandedMatchDetails, setExpandedMatchDetails] = useState<string | null>(null);

  const [localMatchScores, setLocalMatchScores] = useState<Map<string, MatchResult>>(new Map());
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [scoreProgress, setScoreProgress] = useState({ current: 0, total: 0 });
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);

  const {
    isLoading: isAILoading,
    isReady: isAIReady,
    progress: aiProgress,
    status: aiStatus,
    initialize: initializeAI,
    batchCalculateMatchScores,
  } = useBrowserAI();

  const hasActiveFilters = Boolean(
    searchQuery || 
    filters.source || 
    filters.applicationStatus || 
    filters.isUnread || 
    filters.isBookmarked
  );

  useEffect(() => {
    const loadResume = async () => {
      try {
        const resume = await api.getResume();
        if (resume) {
          setResumeSkills(resume.skills);
          const resumeResponse = await fetch(`/api/resume/raw`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).catch(() => null);
          if (resumeResponse?.ok) {
            const data = await resumeResponse.json();
            setResumeText(data.rawText);
          }
        }
      } catch {
        // No resume uploaded
      }
    };
    loadResume();
  }, []);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeFilters: JobFilters = { ...filters };
      if (searchQuery) activeFilters.search = searchQuery;

      const [jobsResponse, countsResponse] = await Promise.all([
        api.getJobs(page, 50, activeFilters),
        api.getJobCounts(),
      ]);

      setJobs(jobsResponse.data);
      setTotalPages(jobsResponse.pagination.pages);
      setCounts(countsResponse);
    } catch (error: any) {
      toast.error('Failed to load jobs', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [page, filters, searchQuery]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleCalculateMatchScores = async () => {
    if (!resumeSkills.length) {
      toast.error('No resume uploaded', {
        description: 'Please upload your resume first to calculate match scores.',
      });
      return;
    }

    if (jobs.length === 0) {
      toast.error('No jobs to score', {
        description: 'Load some jobs first before calculating match scores.',
      });
      return;
    }

    setIsCalculatingScores(true);
    setScoreProgress({ current: 0, total: jobs.length });

    try {
      if (!isAIReady) {
        toast.info('Loading AI model...', {
          description: 'This may take a moment on first use.',
        });
        await initializeAI();
      }

      const resumeContent = resumeText || resumeSkills.join(' ');
      const jobsToScore = jobs.map(j => ({
        id: j._id,
        description: `${j.title} ${j.company} ${j.location} ${j.description || ''}`,
      }));

      const scores = await batchCalculateMatchScores(
        resumeContent,
        jobsToScore,
        (current, total) => setScoreProgress({ current, total })
      );

      setLocalMatchScores(scores);
      toast.success('Match scores calculated!', {
        description: `Scored ${scores.size} jobs using AI.`,
      });
    } catch (error: any) {
      toast.error('Failed to calculate scores', {
        description: error.message || 'An error occurred while calculating match scores.',
      });
    } finally {
      setIsCalculatingScores(false);
    }
  };

  const getJobMatchScore = (jobId: string): MatchResult | null => {
    return localMatchScores.get(jobId) || null;
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllJobsAsRead();
      setJobs(prev => prev.map(j => ({ ...j, isUnread: false })));
      setCounts(prev => ({ ...prev, new: 0 }));
      toast.success('All jobs marked as read');
    } catch (error: any) {
      toast.error('Failed to mark jobs as read');
    }
  };

  const handleToggleBookmark = async (job: Job) => {
    try {
      const updated = await api.toggleJobBookmark(job._id);
      setJobs(jobs.map(j => j._id === job._id ? updated : j));
      if (selectedJob?._id === job._id) setSelectedJob(updated);
      setCounts(prev => ({
        ...prev,
        bookmarked: prev.bookmarked + (updated.isBookmarked ? 1 : -1)
      }));
      toast.success(updated.isBookmarked ? 'Job bookmarked' : 'Bookmark removed');
    } catch (error: any) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleStatusChange = async (job: Job, status: ApplicationStatus) => {
    try {
      const oldStatus = job.applicationStatus;
      const updated = await api.updateJobStatus(job._id, status);
      setJobs(jobs.map(j => j._id === job._id ? updated : j));
      if (selectedJob?._id === job._id) setSelectedJob(updated);
      setCounts(prev => ({
        ...prev,
        applied: prev.applied + 
          (status !== 'none' && oldStatus === 'none' ? 1 : 0) +
          (status === 'none' && oldStatus !== 'none' ? -1 : 0)
      }));
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      await api.deleteJob(job._id);
      setJobs(prev => prev.filter(j => j._id !== job._id));
      if (selectedJob?._id === job._id) setSelectedJob(null);
      setCounts(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        new: job.isUnread ? Math.max(0, prev.new - 1) : prev.new,
        bookmarked: job.isBookmarked ? Math.max(0, prev.bookmarked - 1) : prev.bookmarked,
        applied: job.applicationStatus !== 'none' ? Math.max(0, prev.applied - 1) : prev.applied,
      }));
      toast.success('Job deleted');
    } catch (error: any) {
      toast.error('Failed to delete job');
    }
  };

  const handleApplyClick = async (job: Job) => {
    window.open(job.url, '_blank');
    if (job.applicationStatus === 'none') {
      await handleStatusChange(job, 'applied');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (score >= 60) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const getMatchScoreIcon = (score: number) => {
    if (score >= 80) return <Zap size={12} className="text-green-600" />;
    if (score >= 60) return <Target size={12} className="text-emerald-600" />;
    if (score >= 40) return <TrendingUp size={12} className="text-yellow-600" />;
    return <AlertCircle size={12} className="text-gray-500" />;
  };

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
                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Jobs</h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">({counts.total} total)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateMatchScores}
                disabled={isCalculatingScores || isAILoading || !resumeSkills.length}
                className="rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
              >
                {isCalculatingScores ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                    {scoreProgress.current}/{scoreProgress.total}
                  </>
                ) : isAILoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                    {Math.round(aiProgress)}%
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    AI Match
                  </>
                )}
              </Button>
              {counts.new > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Mark All Read ({counts.new})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadJobs}
                className="rounded-xl"
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{counts.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">New</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{counts.new}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Bookmarked</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{counts.bookmarked}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Applied</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.applied}</div>
          </div>
        </div>

        {/* AI Status Banner */}
        {isAILoading && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6">
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

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={filters.source || ''}
              onChange={(e) => setFilters({ ...filters, source: e.target.value as JobSource || undefined })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Sources</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukri">Naukri</option>
              <option value="remoteok">RemoteOK</option>
              <option value="arbeitnow">Arbeitnow</option>
              <option value="jobicy">Jobicy</option>
            </select>

            <select
              value={filters.applicationStatus || ''}
              onChange={(e) => setFilters({ ...filters, applicationStatus: e.target.value as ApplicationStatus || undefined })}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="none">Not Applied</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button
              variant={filters.isUnread ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, isUnread: filters.isUnread ? undefined : true })}
              className="rounded-xl"
            >
              <Sparkles size={16} className="mr-1" />
              New Only
            </Button>

            <Button
              variant={filters.isBookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, isBookmarked: filters.isBookmarked ? undefined : true })}
              className="rounded-xl"
            >
              <Star size={16} className="mr-1" />
              Bookmarked
            </Button>

            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any });
              }}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="postedAt-desc">Latest First</option>
              <option value="postedAt-asc">Oldest First</option>
              <option value="createdAt-desc">Recently Added</option>
              <option value="company-asc">Company A-Z</option>
            </select>
          </div>
        </div>

        {/* Job List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Briefcase size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {hasActiveFilters ? 'No matching jobs' : 'No jobs yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              {hasActiveFilters ? (
                <>
                  No jobs match your current filters.
                  {searchQuery && <span className="block mt-1">Search: "{searchQuery}"</span>}
                  {filters.source && <span className="block mt-1">Source: {filters.source}</span>}
                  {filters.applicationStatus && <span className="block mt-1">Status: {filters.applicationStatus}</span>}
                  {filters.isUnread && <span className="block mt-1">Showing: New only</span>}
                  {filters.isBookmarked && <span className="block mt-1">Showing: Bookmarked only</span>}
                </>
              ) : counts.total === 0 ? (
                'Create and run a workflow to start collecting jobs from various sources.'
              ) : (
                'All jobs have been filtered out. Try adjusting your filters.'
              )}
            </p>
            {hasActiveFilters ? (
              <Button 
                onClick={() => {
                  setFilters({ sortBy: 'postedAt', sortOrder: 'desc' });
                  setSearchQuery('');
                }}
                variant="outline"
                className="mr-2 rounded-xl"
              >
                Clear Filters
              </Button>
            ) : null}
            <Link to="/workflows">
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                {counts.total === 0 ? 'Create Workflow' : 'Go to Workflows'}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {jobs.map((job) => {
                const matchResult = getJobMatchScore(job._id);
                const isExpanded = expandedMatchDetails === job._id;
                
                return (
                  <div
                    key={job._id}
                    className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-all cursor-pointer ${
                      selectedJob?._id === job._id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedJob(job);
                      if (job.isUnread) {
                        api.markJobAsRead(job._id);
                        setJobs(prev => prev.map(j => j._id === job._id ? { ...j, isUnread: false } : j));
                        setCounts(prev => ({ ...prev, new: Math.max(0, prev.new - 1) }));
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleBookmark(job); }}
                            className="text-yellow-500 hover:text-yellow-600"
                          >
                            {job.isBookmarked ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
                          </button>
                          {job.isUnread && (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
                              NEW
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                          
                          {/* AI Match Score Badge */}
                          {matchResult && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedMatchDetails(isExpanded ? null : job._id);
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getMatchScoreColor(matchResult.score)} transition-all hover:ring-2 ring-offset-1`}
                            >
                              {getMatchScoreIcon(matchResult.score)}
                              {matchResult.score}% Match
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                          
                          {/* Server-side match score fallback */}
                          {!matchResult && job.matchScore !== undefined && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMatchScoreColor(job.matchScore)}`}>
                              {job.matchScore}% Match
                            </span>
                          )}
                        </div>

                        {/* Match Details Expansion */}
                        {matchResult && isExpanded && (
                          <div 
                            className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{matchResult.details.semanticScore}%</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Semantic</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{matchResult.details.skillScore}%</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Skills</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{matchResult.details.keywordScore}%</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Keywords</div>
                              </div>
                            </div>
                            
                            {matchResult.matchedSkills.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">✓ Matched Skills</div>
                                <div className="flex flex-wrap gap-1">
                                  {matchResult.matchedSkills.slice(0, 8).map(skill => (
                                    <span key={skill} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                                      {skill}
                                    </span>
                                  ))}
                                  {matchResult.matchedSkills.length > 8 && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                      +{matchResult.matchedSkills.length - 8} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {matchResult.missingSkills.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">✗ Skills to Learn</div>
                                <div className="flex flex-wrap gap-1">
                                  {matchResult.missingSkills.slice(0, 6).map(skill => (
                                    <span key={skill} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                                      {skill}
                                    </span>
                                  ))}
                                  {matchResult.missingSkills.length > 6 && (
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                      +{matchResult.missingSkills.length - 6} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {matchResult.bonusSkills.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">★ Bonus Skills</div>
                                <div className="flex flex-wrap gap-1">
                                  {matchResult.bonusSkills.slice(0, 6).map(skill => (
                                    <span key={skill} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDate(job.postedAt)}
                          </span>
                          {job.salary && (
                            <span className="text-green-600 dark:text-green-400 font-medium">{job.salary}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${SOURCE_COLORS[job.source]}`}>
                            {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                          </span>
                          <select
                            value={job.applicationStatus}
                            onChange={(e) => { e.stopPropagation(); handleStatusChange(job, e.target.value as ApplicationStatus); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${STATUS_COLORS[job.applicationStatus]}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleApplyClick(job); }}
                          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                        >
                          <ExternalLink size={14} className="mr-1" />
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {selectedJob?._id === job._id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {job.description || 'No description available'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
