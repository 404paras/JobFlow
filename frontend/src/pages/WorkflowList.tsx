import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '../contexts/AuthContext';
import type { Workflow } from '../lib/types';
import { api } from '../lib/api';
import { Trash2, Play, Square, LogOut, Plus, Mail, FileText, AlertCircle, Clock, Info, Zap, ZapOff } from 'lucide-react';
import { FeedbackDialog } from '../components/FeedbackDialog';
import { ResumeUpload } from '../components/ResumeUpload';
import { toast } from 'sonner';
import { FEATURES } from '../config/features';

export default function WorkflowList() {
  const { user, logout, isAuthenticated } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningWorkflows, setRunningWorkflows] = useState<Set<string>>(new Set());
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
  const [activatingWorkflow, setActivatingWorkflow] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; workflowId: string; title: string } | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string } | null>(null);

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
    } catch (error: any) {
      console.error('Failed to load workflows:', error);
      toast.error('Failed to load workflows', {
        description: error.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRunningWorkflows = async () => {
    try {
      const running = await api.getRunningWorkflows();
      setRunningWorkflows(new Set(running.map((w) => w.workflowId)));
    } catch (error: any) {
      console.error('Failed to load running workflows:', error);
      // Silent fail for polling - don't spam user with errors
    }
  };

  const openDeleteDialog = (workflowId: string, title: string) => {
    setDeleteDialog({ open: true, workflowId, title });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    
    try {
      await api.deleteWorkflow(deleteDialog.workflowId);
      setWorkflows(workflows.filter((w) => w.workflowId !== deleteDialog.workflowId));
      toast.success('Workflow deleted', {
        description: `"${deleteDialog.title}" has been deleted.`,
      });
    } catch (error: any) {
      console.error('Failed to delete workflow:', error);
      toast.error('Failed to delete workflow', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleExecute = async (workflowId: string) => {
    const workflow = workflows.find(w => w.workflowId === workflowId);
    
    if (!workflow?.isActive) {
      toast.warning('Workflow not active', {
        description: 'Please activate this workflow first before running.',
      });
      return;
    }
    
    if (runningWorkflows.size > 0) {
      toast.warning('Another workflow is running', {
        description: 'You can only run one workflow at a time. Please stop the running workflow first.',
      });
      return;
    }

    setExecutingWorkflow(workflowId);
    try {
      await api.executeWorkflow(workflowId);
      setRunningWorkflows(new Set([workflowId]));
      toast.success('Workflow started', {
        description: 'Your workflow is now running. You will receive an email once complete.',
      });
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
      toast.error('Workflow execution failed', {
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
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
      toast.info('Workflow stopped', {
        description: 'The workflow has been stopped.',
      });
    } catch (error: any) {
      console.error('Failed to stop workflow:', error);
      toast.error('Failed to stop workflow', {
        description: error.message || 'Please try again.',
      });
    }
  };

  const handleActivate = async (workflowId: string) => {
    setActivatingWorkflow(workflowId);
    try {
      const updated = await api.activateWorkflow(workflowId);
      setWorkflows(workflows.map(w => 
        w.workflowId === workflowId 
          ? { ...w, isActive: true, activatedAt: updated.activatedAt, deactivatesAt: updated.deactivatesAt }
          : { ...w, isActive: false, activatedAt: undefined, deactivatesAt: undefined }
      ));
      toast.success('Workflow activated', {
        description: 'This workflow will auto-deactivate after 2 days.',
      });
    } catch (error: any) {
      toast.error('Failed to activate workflow', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setActivatingWorkflow(null);
    }
  };

  const handleDeactivate = async (workflowId: string) => {
    setActivatingWorkflow(workflowId);
    try {
      await api.deactivateWorkflow(workflowId);
      setWorkflows(workflows.map(w => 
        w.workflowId === workflowId 
          ? { ...w, isActive: false, activatedAt: undefined, deactivatesAt: undefined }
          : w
      ));
      toast.info('Workflow deactivated', {
        description: 'You can reactivate it anytime.',
      });
    } catch (error: any) {
      toast.error('Failed to deactivate workflow', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setActivatingWorkflow(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSchedule = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      'daily-9am': 'Daily at 9 AM',
      'daily-6pm': 'Daily at 6 PM',
      'weekly': 'Weekly (Mon 9 AM)',
    };
    return scheduleMap[schedule] || schedule;
  };

  const getTimeRemaining = (deactivatesAt: string) => {
    const now = new Date();
    const end = new Date(deactivatesAt);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}d ${remainingHours}h left`;
    }
    return `${hours}h left`;
  };

  const activeWorkflow = workflows.find(w => w.isActive);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full opacity-40 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/workflows" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="JobFlow" className="w-10 h-10 shadow-lg shadow-purple-200 rounded-xl group-hover:scale-105 transition-transform" />
            <h1 className="text-xl font-bold text-gray-900">
              JobFlow
            </h1>
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow-sm">
              BETA
            </span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && FEATURES.RESUME_UPLOAD && <ResumeUpload />}
            <FeedbackDialog />

            {isAuthenticated && (
              <>
                <span className="text-gray-600 text-sm hidden md:block">
                  {user?.name}
                </span>
                <Button 
                  onClick={logout}
                  variant="outline" 
                  className="border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            )}
            <Link to="/workflow/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                <Plus size={16} className="mr-1" />
                New Workflow
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-1">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Workflows</h2>
          <p className="text-gray-600">Manage and run your automation workflows</p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium text-sm">Important: Workflow Activation</p>
              <p className="text-blue-700 text-sm mt-1">
                Only <strong>one workflow</strong> can be active at a time. Active workflows will automatically 
                <strong> deactivate after 2 days</strong>. Visit the app again to reactivate your workflow.
              </p>
            </div>
          </div>
        </div>

        {/* Active Workflow Banner */}
        {activeWorkflow && (
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Zap size={20} className="text-indigo-600" />
              </div>
              <div>
                <span className="text-indigo-800 font-semibold block">
                  Active: {activeWorkflow.title}
                </span>
                <span className="text-indigo-600 text-sm flex items-center gap-1">
                  <Clock size={14} />
                  {activeWorkflow.deactivatesAt ? getTimeRemaining(activeWorkflow.deactivatesAt) : '2 days'}
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleDeactivate(activeWorkflow.workflowId)}
              disabled={activatingWorkflow === activeWorkflow.workflowId}
              size="sm"
              variant="outline"
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              <ZapOff size={14} className="mr-1" />
              Deactivate
            </Button>
          </div>
        )}

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
              <FileText className="w-10 h-10 text-indigo-600" />
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
              const isActivating = activatingWorkflow === workflow.workflowId;
              const isThisActive = workflow.isActive;
              
              return (
                <div
                  key={workflow._id}
                  className={`group bg-white border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 ${
                    isThisActive 
                      ? 'border-indigo-300 bg-indigo-50/30 ring-2 ring-indigo-200' 
                      : isRunning 
                        ? 'border-green-300 bg-green-50/50' 
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {workflow.title}
                        </h3>
                        {isThisActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                            <Zap size={10} />
                            ACTIVE
                          </span>
                        )}
                      </div>
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
                      <div className="text-indigo-600 flex items-center gap-1">
                        <Mail size={14} />
                        {formatSchedule(workflow.emailConfig.schedule)}
                      </div>
                    )}
                    {isThisActive && workflow.deactivatesAt && (
                      <div className="text-amber-600 flex items-center gap-1 font-medium">
                        <Clock size={14} />
                        Auto-deactivates: {getTimeRemaining(workflow.deactivatesAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Activate/Deactivate Button for published workflows */}
                    {workflow.status === 'published' && (
                      isThisActive ? (
                        <Button
                          onClick={() => handleDeactivate(workflow.workflowId)}
                          disabled={isActivating}
                          size="sm"
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                        >
                          {isActivating ? (
                            <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                          ) : (
                            <ZapOff size={14} className="mr-1" />
                          )}
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleActivate(workflow.workflowId)}
                          disabled={isActivating}
                          size="sm"
                          className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-200"
                        >
                          {isActivating ? (
                            <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
                          ) : (
                            <Zap size={14} className="mr-1" />
                          )}
                          Activate
                        </Button>
                      )
                    )}
                    
                    {/* Run/Stop Button - only for active published workflows */}
                    {workflow.status === 'published' && isThisActive && (
                      isRunning ? (
                        <Button
                          onClick={() => handleStop(workflow.workflowId)}
                          size="sm"
                          className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
                        >
                          <Square size={14} className="mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleExecute(workflow.workflowId)}
                          disabled={isExecuting || runningWorkflows.size > 0}
                          size="sm"
                          className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 disabled:opacity-50"
                        >
                          {isExecuting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mr-2" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play size={14} className="mr-1" />
                              Run
                            </>
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
                      onClick={() => openDeleteDialog(workflow.workflowId, workflow.title)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog?.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Workflow
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteDialog?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog?.open} onOpenChange={(open) => !open && setErrorDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-100 bg-white/50 backdrop-blur-sm py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          © 2025 JobFlow. Built with ❤️ by <a href="https://github.com/404paras" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">Paras Garg</a>
        </div>
      </footer>
    </div>
  );
}
