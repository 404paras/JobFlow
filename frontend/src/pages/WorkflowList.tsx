import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import type { Workflow } from '../lib/types';
import { api } from '../lib/api';

export default function WorkflowList() {
  const { user, logout, isAuthenticated } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set());
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
    loadRunningWorkflows();
    
    // Poll for running workflows status (every 30 seconds instead of 5)
    const interval = setInterval(loadRunningWorkflows, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await api.getWorkflows(1, 50);
      setWorkflows(response.data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRunningWorkflows = async () => {
    try {
      const running = await api.getRunningWorkflows();
      setRunningWorkflows(new Set(running.map((w) => w.workflowId)));
    } catch (error) {
      console.error('Failed to load running workflows:', error);
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await api.deleteWorkflow(workflowId);
      setWorkflows(workflows.filter((w) => w.workflowId !== workflowId));
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleExecute = async (workflowId: string) => {
    if (runningWorkflows.size > 0) {
      alert('You can only run one workflow at a time. Please stop the running workflow first.');
      return;
    }

    setExecutingWorkflow(workflowId);
    try {
      await api.executeWorkflow(workflowId);
      setRunningWorkflows(new Set([workflowId]));
    } catch (error: any) {
      alert(error.message || 'Failed to execute workflow');
    } finally {
      setExecutingWorkflow(null);
    }
  };

  const handleStop = async (workflowId: string) => {
    try {
      await api.stopWorkflow(workflowId);
      setRunningWorkflows((prev) => {
        const next = new Set(prev);
        next.delete(workflowId);
        return next;
      });
    } catch (error) {
      console.error('Failed to stop workflow:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              JobFlow
            </h1>
          </Link>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <span className="text-gray-600 text-sm hidden sm:block">
                  {user?.name}
                </span>
                <Button 
                  onClick={logout}
                  variant="ghost" 
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  Logout
                </Button>
              </>
            )}
            <Link to="/workflow/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                + New Workflow
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Workflows</h2>
          <p className="text-gray-600">Manage and run your automation workflows</p>
        </div>

        {/* Running Workflow Banner */}
        {runningWorkflows.size > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 font-medium">
                Workflow is running...
              </span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No workflows yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create your first automation workflow to start aggregating and filtering job listings
            </p>
            <Link to="/workflow/new">
              <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xl shadow-indigo-200 rounded-xl">
                Create Your First Workflow
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map((workflow) => {
              const isRunning = runningWorkflows.has(workflow.workflowId);
              const isExecuting = executingWorkflow === workflow.workflowId;
              
              return (
                <div
                  key={workflow._id}
                  className={`group bg-white border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${
                    isRunning ? 'border-green-300 bg-green-50/50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {workflow.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            workflow.status === 'published'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : workflow.status === 'paused'
                              ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {workflow.status === 'published' ? '● Published' : workflow.status === 'paused' ? '◐ Paused' : '○ Draft'}
                        </span>
                        <span className="text-xs text-gray-500">{workflow.nodeCount} nodes</span>
                        {isRunning && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Running
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-500 mb-4 space-y-1">
                    <div>Updated: {formatDate(workflow.updatedAt)}</div>
                    {workflow.executionCount > 0 && (
                      <div>Executed: {workflow.executionCount} times</div>
                    )}
                    {workflow.emailConfig?.recipients && (
                      <div className="text-indigo-600">📧 {workflow.emailConfig.schedule}</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {workflow.status === 'published' && (
                      isRunning ? (
                        <Button
                          onClick={() => handleStop(workflow.workflowId)}
                          size="sm"
                          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
                        >
                          ⏹ Stop
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleExecute(workflow.workflowId)}
                          disabled={isExecuting || runningWorkflows.size > 0}
                          size="sm"
                          className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 disabled:opacity-50"
                        >
                          {isExecuting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mr-2" />
                              Starting...
                            </>
                          ) : (
                            '▶ Run Now'
                          )}
                        </Button>
                      )
                    )}
                    <Link to={`/workflow/${workflow.workflowId}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                        {workflow.status === 'published' ? 'View' : 'Edit'}
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleDelete(workflow.workflowId)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      🗑
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
