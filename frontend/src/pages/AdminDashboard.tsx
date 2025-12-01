import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { 
  Users, 
  MessageSquare, 
  Workflow, 
  TrendingUp,
  ArrowLeft,
  CheckCircle,
  Eye,
  UserX,
  UserCheck,
  Shield
} from 'lucide-react';

interface Stats {
  users: { total: number; active: number };
  workflows: { total: number; published: number };
  feedback: { total: number; new: number };
  recentUsers: any[];
  recentWorkflows: any[];
  dailySignups: { _id: string; count: number }[];
}

interface UserData {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  isAdmin: boolean;
  workflowCount: number;
  lastLoginAt?: string;
  createdAt: string;
}

interface FeedbackData {
  _id: string;
  type: string;
  message: string;
  rating?: number;
  userEmail?: string;
  status: 'new' | 'reviewed' | 'resolved';
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'feedbacks'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('');

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access denied');
      navigate('/workflows');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, feedbacksData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminFeedbacks(),
      ]);
      setStats(statsData);
      setUsers(usersData.data);
      setFeedbacks(feedbacksData.data);
    } catch (error: any) {
      toast.error('Failed to load admin data', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    try {
      const result = await api.toggleUserActive(userId);
      setUsers(users.map(u => 
        u._id === userId ? { ...u, isActive: result.isActive } : u
      ));
      toast.success(result.isActive ? 'User activated' : 'User deactivated');
    } catch (error: any) {
      toast.error('Failed to update user');
    }
  };

  const handleUpdateFeedback = async (id: string, status: string) => {
    try {
      await api.updateFeedback(id, { status });
      setFeedbacks(feedbacks.map(f => 
        f._id === id ? { ...f, status: status as any } : f
      ));
      toast.success('Feedback updated');
    } catch (error: any) {
      toast.error('Failed to update feedback');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'reviewed': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-700';
      case 'feature': return 'bg-purple-100 text-purple-700';
      case 'improvement': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/workflows')}
                className="text-gray-600"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            <span className="text-sm text-gray-500">
              Logged in as {user?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id as any)}
              className={activeTab === tab.id ? 'bg-indigo-600' : ''}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                    <p className="text-xs text-green-600">{stats.users.active} active</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Workflow className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Workflows</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.workflows.total}</p>
                    <p className="text-xs text-green-600">{stats.workflows.published} published</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Feedbacks</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.feedback.total}</p>
                    <p className="text-xs text-blue-600">{stats.feedback.new} new</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {stats.recentUsers.map((u: any) => (
                    <div key={u._id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Workflows</h3>
                <div className="space-y-3">
                  {stats.recentWorkflows.map((w: any) => (
                    <div key={w._id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{w.title}</p>
                        <p className="text-sm text-gray-500">{w.workflowId}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${w.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Workflows</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                        {u.isAdmin && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.workflowCount || 0}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {!u.isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserActive(u._id)}
                          className={u.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Feedbacks Tab */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              {['', 'new', 'reviewed', 'resolved'].map((status) => (
                <Button
                  key={status || 'all'}
                  variant={feedbackFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeedbackFilter(status)}
                  className={feedbackFilter === status ? 'bg-indigo-600' : ''}
                >
                  {status || 'All'}
                </Button>
              ))}
            </div>

            {/* Feedback List */}
            <div className="space-y-4">
              {feedbacks
                .filter(f => !feedbackFilter || f.status === feedbackFilter)
                .map((f) => (
                <div key={f._id} className="bg-white rounded-xl p-6 shadow-sm border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(f.type)}`}>
                        {f.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(f.status)}`}>
                        {f.status}
                      </span>
                      {f.rating && (
                        <span className="text-yellow-500 text-sm">
                          {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(f.createdAt)}</span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{f.message}</p>
                  
                  {f.userEmail && (
                    <p className="text-sm text-gray-500 mb-3">From: {f.userEmail}</p>
                  )}
                  
                  <div className="flex gap-2">
                    {f.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateFeedback(f._id, 'reviewed')}
                      >
                        <Eye size={14} className="mr-1" />
                        Mark Reviewed
                      </Button>
                    )}
                    {f.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleUpdateFeedback(f._id, 'resolved')}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

