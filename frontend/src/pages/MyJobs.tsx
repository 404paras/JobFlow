import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import type { Job, JobFilters, JobCounts, ApplicationStatus, JobSource } from '../lib/types';
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
  Filter,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const SOURCE_COLORS: Record<JobSource, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  naukri: 'bg-purple-100 text-purple-700',
  remoteok: 'bg-green-100 text-green-700',
  google: 'bg-red-100 text-red-700',
  wellfound: 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  none: 'bg-gray-100 text-gray-600',
  applied: 'bg-blue-100 text-blue-700',
  interview: 'bg-yellow-100 text-yellow-700',
  offer: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  none: 'Not Applied',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export default function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<JobCounts>({ total: 0, new: 0, bookmarked: 0, applied: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<JobFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeFilters: JobFilters = { ...filters };
      if (searchQuery) activeFilters.search = searchQuery;

      const [jobsResponse, countsResponse] = await Promise.all([
        api.getJobs(page, 20, activeFilters),
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

  const handleMarkAllRead = async () => {
    try {
      await api.markAllJobsAsRead();
      toast.success('All jobs marked as read');
      loadJobs();
    } catch (error: any) {
      toast.error('Failed to mark jobs as read');
    }
  };

  const handleToggleBookmark = async (job: Job) => {
    try {
      const updated = await api.toggleJobBookmark(job._id);
      setJobs(jobs.map(j => j._id === job._id ? updated : j));
      if (selectedJob?._id === job._id) setSelectedJob(updated);
      toast.success(updated.isBookmarked ? 'Job bookmarked' : 'Bookmark removed');
    } catch (error: any) {
      toast.error('Failed to update bookmark');
    }
  };

  const handleStatusChange = async (job: Job, status: ApplicationStatus) => {
    try {
      const updated = await api.updateJobStatus(job._id, status);
      setJobs(jobs.map(j => j._id === job._id ? updated : j));
      if (selectedJob?._id === job._id) setSelectedJob(updated);
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      await api.deleteJob(job._id);
      setJobs(jobs.filter(j => j._id !== job._id));
      if (selectedJob?._id === job._id) setSelectedJob(null);
      toast.success('Job deleted');
      loadJobs();
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

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
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
                <Briefcase className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
                <span className="text-sm text-gray-500">({counts.total} total)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {counts.new > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-sm text-gray-500">Total Jobs</div>
            <div className="text-2xl font-bold text-gray-900">{counts.total}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-sm text-gray-500">New</div>
            <div className="text-2xl font-bold text-indigo-600">{counts.new}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-sm text-gray-500">Bookmarked</div>
            <div className="text-2xl font-bold text-yellow-600">{counts.bookmarked}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="text-sm text-gray-500">Applied</div>
            <div className="text-2xl font-bold text-green-600">{counts.applied}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={filters.source || ''}
              onChange={(e) => setFilters({ ...filters, source: e.target.value as JobSource || undefined })}
              className="px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sources</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukri">Naukri</option>
              <option value="remoteok">RemoteOK</option>
              <option value="google">Google</option>
              <option value="wellfound">Wellfound</option>
            </select>

            <select
              value={filters.applicationStatus || ''}
              onChange={(e) => setFilters({ ...filters, applicationStatus: e.target.value as ApplicationStatus || undefined })}
              className="px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
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
              className="px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="matchScore-desc">Best Match</option>
              <option value="company-asc">Company A-Z</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || Object.keys(filters).length > 2
                ? 'Try adjusting your filters'
                : 'Run a workflow to start collecting jobs'}
            </p>
            <Link to="/workflows">
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                Go to Workflows
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer ${
                    selectedJob?._id === job._id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedJob(job);
                    if (job.isUnread) api.markJobAsRead(job._id);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleBookmark(job); }}
                          className="text-yellow-500 hover:text-yellow-600"
                        >
                          {job.isBookmarked ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
                        </button>
                        {job.isUnread && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                            NEW
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        {job.matchScore !== undefined && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getMatchScoreColor(job.matchScore)}`}>
                            {job.matchScore}% Match
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
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
                          <span className="text-green-600 font-medium">{job.salary}</span>
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
                        className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {selectedJob?._id === job._id && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {job.description || 'No description available'}
                      </p>
                    </div>
                  )}
                </div>
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
                <span className="px-4 py-2 text-sm text-gray-600">
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

