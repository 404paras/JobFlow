import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '../lib/api';
import { browserAI } from '../services/browserAI';
import type { Job } from '../lib/types';
import { toast } from 'sonner';
import {
  ArrowLeft,
  TrendingUp,
  Building2,
  MapPin,
  DollarSign,
  BarChart3,
  PieChart,
  RefreshCw,
  Briefcase,
  Globe,
  Clock,
  Layers,
} from 'lucide-react';

interface AnalyticsData {
  topSkills: { skill: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  locationDistribution: { location: string; count: number }[];
  sourceDistribution: { source: string; count: number }[];
  salaryRanges: { range: string; count: number }[];
  jobTypes: { type: string; count: number }[];
  postingTrends: { date: string; count: number }[];
}

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#0077b5',
  naukri: '#b22222',
  remoteok: '#10b981',
  arbeitnow: '#f97316',
  jobicy: '#06b6d4',
};

const normalizeLocation = (location: string): string => {
  if (!location) return 'Not Specified';
  const lower = location.toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('bangalore') || lower.includes('bengaluru')) return 'Bangalore';
  if (lower.includes('mumbai')) return 'Mumbai';
  if (lower.includes('delhi') || lower.includes('gurgaon') || lower.includes('noida')) return 'Delhi NCR';
  if (lower.includes('hyderabad')) return 'Hyderabad';
  if (lower.includes('pune')) return 'Pune';
  if (lower.includes('chennai')) return 'Chennai';
  if (lower.includes('kolkata')) return 'Kolkata';
  if (lower.includes('usa') || lower.includes('united states')) return 'USA';
  if (lower.includes('uk') || lower.includes('london')) return 'UK';
  if (lower.includes('europe') || lower.includes('germany') || lower.includes('berlin')) return 'Europe';
  return location.length > 20 ? location.slice(0, 20) + '...' : location;
};

const categorizeSalary = (salary: string): string => {
  if (!salary) return 'Not Specified';
  const lower = salary.toLowerCase();
  const numbers = lower.match(/\d+/g);
  if (!numbers) return 'Not Specified';
  
  const value = parseInt(numbers[0]);
  
  if (lower.includes('lpa') || lower.includes('lakhs') || lower.includes('lac')) {
    if (value < 5) return 'Entry (<5L)';
    if (value < 10) return 'Mid (5-10L)';
    if (value < 20) return 'Senior (10-20L)';
    if (value < 30) return 'Lead (20-30L)';
    return 'Executive (30L+)';
  }
  
  if (lower.includes('$') || lower.includes('usd') || lower.includes('k')) {
    const adjustedValue = lower.includes('k') ? value * 1000 : value;
    if (adjustedValue < 50000) return 'Entry (<5L)';
    if (adjustedValue < 100000) return 'Mid (5-10L)';
    if (adjustedValue < 150000) return 'Senior (10-20L)';
    return 'Executive (30L+)';
  }
  
  return 'Not Specified';
};

const analyzeJobs = (jobList: Job[]): AnalyticsData => {
  const skillCounts = new Map<string, number>();
  const companyCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const salaryRanges = new Map<string, number>();
  const dateCounts = new Map<string, number>();

  for (const job of jobList) {
    if (job.company) {
      companyCounts.set(job.company, (companyCounts.get(job.company) || 0) + 1);
    }

    const normalizedLocation = normalizeLocation(job.location);
    locationCounts.set(normalizedLocation, (locationCounts.get(normalizedLocation) || 0) + 1);

    sourceCounts.set(job.source, (sourceCounts.get(job.source) || 0) + 1);

    const textToAnalyze = `${job.title || ''} ${job.description || ''}`;
    if (textToAnalyze.trim()) {
      const skills = browserAI.extractSkills(textToAnalyze);
      for (const skill of [...skills.technical, ...skills.soft]) {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      }
    }

    if (job.salary) {
      const range = categorizeSalary(job.salary);
      salaryRanges.set(range, (salaryRanges.get(range) || 0) + 1);
    }

    if (job.postedAt) {
      const dateKey = new Date(job.postedAt).toISOString().split('T')[0];
      dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
    }
  }

  return {
    topSkills: Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count })),
    topCompanies: Array.from(companyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company, count]) => ({ company, count })),
    locationDistribution: Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count })),
    sourceDistribution: Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    salaryRanges: Array.from(salaryRanges.entries())
      .sort((a, b) => {
        const order = ['Entry (<5L)', 'Mid (5-10L)', 'Senior (10-20L)', 'Lead (20-30L)', 'Executive (30L+)', 'Not Specified'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([range, count]) => ({ range, count })),
    jobTypes: [],
    postingTrends: Array.from(dateCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date, count })),
  };
};

export default function MarketTrends() {
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.getJobs(1, 500, {});
      console.log('Fetched jobs for trends:', response.data.length);
      setJobs(response.data);
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load data', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const analytics = useMemo(() => {
    if (jobs.length === 0) return null;
    console.log('Analyzing jobs...', jobs.length);
    return analyzeJobs(jobs);
  }, [jobs]);

  const getBarWidth = (value: number, max: number) => {
    return `${Math.round((value / max) * 100)}%`;
  };

  const totalJobs = jobs.length;
  const remoteJobs = analytics?.locationDistribution.find(l => l.location === 'Remote')?.count || 0;
  const remotePercentage = totalJobs > 0 ? Math.round((remoteJobs / totalJobs) * 100) : 0;

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
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Market Trends</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="rounded-xl"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading job data...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <BarChart3 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Jobs Data</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Run a workflow to collect jobs and see market trends.
            </p>
            <Link to="/workflows">
              <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                Go to Workflows
              </Button>
            </Link>
          </div>
        ) : analytics && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={18} className="text-blue-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalJobs}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={18} className="text-green-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Remote Jobs</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{remotePercentage}%</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-purple-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Companies</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.topCompanies.length}+</div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Layers size={18} className="text-cyan-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Sources</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.sourceDistribution.length}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Skills */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600" />
                  Trending Skills ({analytics.topSkills.length})
                </h2>
                {analytics.topSkills.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topSkills.slice(0, 12).map((item, index) => (
                      <div key={item.skill}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            {index < 3 && (
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {index + 1}
                              </span>
                            )}
                            {item.skill}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.count} jobs</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getBarWidth(item.count, analytics.topSkills[0].count) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No skills data available.</p>
                )}
              </div>

              {/* Top Companies */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-purple-600" />
                  Top Hiring Companies
                </h2>
                {analytics.topCompanies.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topCompanies.map((item, index) => (
                      <div key={item.company}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300">
                              {index + 1}
                            </span>
                            {item.company}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.count} jobs</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getBarWidth(item.count, analytics.topCompanies[0].count) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No company data available.</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Location Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={20} className="text-green-600" />
                  Locations
                </h2>
                <div className="space-y-2">
                  {analytics.locationDistribution.map((item) => (
                    <div key={item.location} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.location}</span>
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Distribution */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-blue-600" />
                  Job Sources
                </h2>
                <div className="space-y-3">
                  {analytics.sourceDistribution.map((item) => {
                    const percentage = Math.round((item.count / totalJobs) * 100);
                    return (
                      <div key={item.source}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{item.source}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: SOURCE_COLORS[item.source] || '#6366f1'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Salary Ranges */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign size={20} className="text-yellow-600" />
                  Salary Ranges
                </h2>
                {analytics.salaryRanges.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.salaryRanges.map((item) => (
                      <div key={item.range} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.range}</span>
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No salary data available in job listings.
                  </p>
                )}
              </div>
            </div>

            {/* Posting Trends */}
            {analytics.postingTrends.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-cyan-600" />
                  Posting Activity (Last 14 Days)
                </h2>
                <div className="flex items-end gap-1 h-32">
                  {analytics.postingTrends.map((item) => {
                    const maxCount = Math.max(...analytics.postingTrends.map(t => t.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    const date = new Date(item.date);
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    return (
                      <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.count}</span>
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-lg transition-all duration-500 hover:from-cyan-400 hover:to-blue-400"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${item.date}: ${item.count} jobs`}
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Key Insights
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {analytics.topSkills[0] && (
                  <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Most In-Demand Skill</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 capitalize">{analytics.topSkills[0].skill}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Required in {Math.round((analytics.topSkills[0].count / totalJobs) * 100)}% of jobs</p>
                  </div>
                )}
                {analytics.topCompanies[0] && (
                  <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Top Hiring Company</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.topCompanies[0].company}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{analytics.topCompanies[0].count} open positions</p>
                  </div>
                )}
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Remote Work</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{remotePercentage}%</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">of jobs offer remote options</p>
                </div>
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Market Activity</h4>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalJobs}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">jobs collected from {analytics.sourceDistribution.length} sources</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
