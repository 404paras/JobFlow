import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Star,
  StarOff,
  Search,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Brain,
  Zap,
} from 'lucide-react';
import { JobCard } from '@/components/ui/JobCard';

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
      
      // Auto-sort by match score if we just calculated them
      if (filters.sortBy !== 'matchScore') {
          setFilters(prev => ({ ...prev, sortBy: 'matchScore', sortOrder: 'desc' }));
      }
    } catch (error: any) {
      toast.error('Failed to calculate scores', {
        description: error.message || 'An error occurred while calculating match scores.',
      });
    } finally {
      setIsCalculatingScores(false);
    }
  };

  const sortedJobs = useMemo(() => {
      let sorted = [...jobs];
      if (filters.sortBy === 'matchScore') {
          sorted.sort((a, b) => {
              const scoreA = localMatchScores.get(a._id)?.score || a.matchScore || 0;
              const scoreB = localMatchScores.get(b._id)?.score || b.matchScore || 0;
              return filters.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
          });
      }
      return sorted;
  }, [jobs, localMatchScores, filters.sortBy, filters.sortOrder]);


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

  const handleToggleBookmark = async (jobId: string) => {
    try {
      const updated = await api.toggleJobBookmark(jobId);
      setJobs(jobs.map(j => j._id === jobId ? updated : j));
      if (selectedJob?._id === jobId) setSelectedJob(updated);
      setCounts(prev => ({
        ...prev,
        bookmarked: prev.bookmarked + (updated.isBookmarked ? 1 : -1)
      }));
      toast.success(updated.isBookmarked ? 'Job bookmarked' : 'Bookmark removed');
    } catch (error: any) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleStatusChange = async (jobId: string, status: ApplicationStatus) => {
    try {
      const job = jobs.find(j => j._id === jobId);
      if (!job) return;
      
      const oldStatus = job.applicationStatus;
      const updated = await api.updateJobStatus(jobId, status);
      setJobs(jobs.map(j => j._id === jobId ? updated : j));
      if (selectedJob?._id === jobId) setSelectedJob(updated);
      setCounts(prev => ({
        ...prev,
        applied: prev.applied + 
          (status !== 'none' && oldStatus === 'none' ? 1 : 0) +
          (status === 'none' && oldStatus !== 'none' ? -1 : 0)
      }));
      // Only show toast if triggered manually, but this function is used by JobCard
      toast.success(`Status updated to ${status}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleViewDetails = (job: Job) => {
     // Currently we just expand the card, but this could open a modal or navigate
     // For now, let's just log or maybe use it to trigger a specific AI analysis view later
     console.log("View details for", job.title);
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
              <option value="matchScore-desc">Highest Match</option>
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
              {sortedJobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    matchResult={localMatchScores.get(job._id)}
                    onBookmark={handleToggleBookmark}
                    onStatusChange={handleStatusChange}
                    onViewDetails={handleViewDetails}
                  />
              ))}
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
