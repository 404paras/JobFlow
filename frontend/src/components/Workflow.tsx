import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CustomNode, JobTriggerNode, JobSourceNode, NormalizeDataNode, FilterNode, JobsOutputNode, type NodeData } from './nodes';
import { Trash2, Zap, Save, Rocket, ArrowLeft, Pencil, Lock, Plus, RefreshCw, Filter, Briefcase, Clock, Bell } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog';

type WorkflowNode = Node<NodeData>;
type WorkflowEdge = Edge;

const initialNodes: WorkflowNode[] = [];
const initialEdges: WorkflowEdge[] = [];

const nodeTypes = {
  custom: CustomNode,
  jobTrigger: JobTriggerNode,
  jobSource: JobSourceNode,
  normalizeData: NormalizeDataNode,
  filter: FilterNode,
  jobsOutput: JobsOutputNode,
};

const generateUniqueName = (): string => {
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `Workflow${randomId}`;
};

function Workflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const generateWorkflowId = () => `WF-${Date.now().toString(36).toUpperCase()}`;
  
  const [workflowId, setWorkflowId] = useState<string>(id || generateWorkflowId());
  const [workflowTitle, setWorkflowTitle] = useState<string>(() => id ? 'New Workflow' : generateUniqueName());
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'published' | 'paused'>('draft');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(!!id);
  
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [showInitialPopover, setShowInitialPopover] = useState(false);
  const [showJobSourcePopover, setShowJobSourcePopover] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  
  const [selectedJobSource, setSelectedJobSource] = useState<string>('');
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showNormalise, setShowNormalise] = useState<boolean>(false);
  
  const [fieldMapping, setFieldMapping] = useState<string>('auto');
  const [dataFormat, setDataFormat] = useState<string>('json');
  const [removeDuplicates, setRemoveDuplicates] = useState<string>('yes');
  const [textCleaning, setTextCleaning] = useState<string>('standard');
  
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [filterTitle, setFilterTitle] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [filterSalaryMin, setFilterSalaryMin] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  const [showNodeSelection, setShowNodeSelection] = useState<boolean>(false);
  const [showJobsOutput, setShowJobsOutput] = useState<boolean>(false);
  const [jobsSchedule, setJobsSchedule] = useState<string>('daily-9am');
  const [jobsMaxJobs, setJobsMaxJobs] = useState<number>(100);
  const [jobsNotifications, setJobsNotifications] = useState<boolean>(true);
  const [jobsRetentionDays, setJobsRetentionDays] = useState<number>(30);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; nodeId: string; nodeCount: number } | null>(null);

  // Load workflow if editing existing one
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.getWorkflow(id)
        .then((workflow) => {
          setWorkflowId(workflow.workflowId);
          setWorkflowTitle(workflow.title);
          setWorkflowStatus(workflow.status);
          setNodes(workflow.nodes || []);
          setEdges(workflow.edges || []);
          setIsReadOnly(workflow.status === 'published');
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  useEffect(() => {
    // Only show initial popover for new workflows (not when editing existing ones)
    if (nodes.length === 0 && !id) {
      setShowInitialPopover(true);
    }
  }, [nodes.length, id]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as WorkflowNode[]),
    [],
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds) as WorkflowEdge[]),
    [],
  );

  const getDownstreamNodes = useCallback((nodeId: string, allEdges: WorkflowEdge[]): Set<string> => {
    const downstream = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const outgoingEdges = allEdges.filter(e => e.source === currentId);
      
      for (const edge of outgoingEdges) {
        if (!downstream.has(edge.target)) {
          downstream.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    
    return downstream;
  }, []);

  const handleDeleteRequest = useCallback((nodeId: string) => {
    if (isReadOnly) return;
    setContextMenu(null);
    
    if (nodeId === 'job-trigger') {
      setDeleteDialog({ open: true, nodeId, nodeCount: nodes.length });
      return;
    }

    const downstreamNodes = getDownstreamNodes(nodeId, edges);
    const nodesToDelete = new Set([nodeId, ...downstreamNodes]);
    const nodeCount = nodesToDelete.size;
    
    setDeleteDialog({ open: true, nodeId, nodeCount });
  }, [edges, isReadOnly, getDownstreamNodes, nodes.length]);

  const confirmDelete = useCallback(() => {
    if (!deleteDialog) return;
    
    const { nodeId } = deleteDialog;
    
    if (nodeId === 'job-trigger') {
      setNodes([]);
      setEdges([]);
    } else {
      const downstreamNodes = getDownstreamNodes(nodeId, edges);
      const nodesToDelete = new Set([nodeId, ...downstreamNodes]);
      
      setNodes(nds => nds.filter(n => !nodesToDelete.has(n.id)));
      setEdges(eds => eds.filter(e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)));
    }
    
    setDeleteDialog(null);
  }, [deleteDialog, edges, getDownstreamNodes]);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: WorkflowNode) => {
      if (isReadOnly) return;
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [isReadOnly]
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null; handleType: string | null }) => {
      // Prevent connections in read-only mode
      if (isReadOnly) return;
      
      if (params.nodeId === 'job-trigger' && params.handleType === 'source') {
        setPendingConnection({ source: params.nodeId, target: '', sourceHandle: null, targetHandle: null });
        setShowJobSourcePopover(true);
      } else if (params.nodeId && params.handleType === 'source') {
        const sourceNode = nodes.find(n => n.id === params.nodeId);
        
        // Jobs output is a terminal node - no connections allowed from it
        if (sourceNode?.data.type === 'jobs-output') {
          return;
        }
        
        if (sourceNode?.data.type === 'job-source' || sourceNode?.data.type === 'normalize-data' || sourceNode?.data.type === 'filter') {
          setPendingConnection({ source: params.nodeId, target: '', sourceHandle: null, targetHandle: null });
          setShowNodeSelection(true);
        }
      }
    },
    [nodes, isReadOnly],
  );

  const onConnect = useCallback(
    (_params: Connection) => {
      return;
    },
    [],
  );

  const addJobTriggerNode = () => {
    const newNode: WorkflowNode = {
      id: 'job-trigger',
      type: 'jobTrigger',
      position: { x: 250, y: 250 },
      data: { label: 'Job Trigger', type: 'trigger' },
    };
    setNodes([newNode]);
    setShowInitialPopover(false);
  };

  const addOrUpdateNormaliseNode = () => {
    const metadata = {
      fieldMapping: fieldMapping === 'auto' ? 'Auto-detect Fields' : 
                   fieldMapping === 'manual' ? 'Manual Mapping' : 'Custom Schema',
      dataFormat: dataFormat === 'json' ? 'JSON' : 
                 dataFormat === 'csv' ? 'CSV' : 'XML',
      removeDuplicates: removeDuplicates === 'yes' ? 'Yes' : 'No',
      textCleaning: textCleaning === 'standard' ? 'Standard' : 
                   textCleaning === 'aggressive' ? 'Aggressive' : 'None',
    };

    if (editingNodeId) {
      // Update existing node
      setNodes((nds) => nds.map(node => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              metadata,
            },
          };
        }
        return node;
      }));
      setEditingNodeId(null);
    } else {
      // Create new node
      if (!pendingConnection) return;

      const existingNormalizeNodes = nodes.filter(n => n.data.type === 'normalize-data');
      const newNodeId = `normalize-${Date.now()}`;
      
      const sourceNode = nodes.find(n => n.id === pendingConnection.source);
      const xOffset = 300;
      const yOffset = existingNormalizeNodes.length * 100;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'normalizeData',
        position: { 
          x: (sourceNode?.position.x || 250) + xOffset, 
          y: (sourceNode?.position.y || 250) + yOffset 
        },
        data: { 
          label: 'Normalize Data', 
          type: 'normalize-data',
          metadata,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${newNodeId}`,
        source: pendingConnection.source!,
        target: newNodeId,
        sourceHandle: pendingConnection.sourceHandle || null,
        targetHandle: pendingConnection.targetHandle || null,
      };
      setEdges((eds) => addEdge(newEdge, eds) as WorkflowEdge[]);

      setPendingConnection(null);
    }

    setShowNormalise(false);
    setFieldMapping('auto');
    setDataFormat('json');
    setRemoveDuplicates('yes');
    setTextCleaning('standard');
  };

  const addOrUpdateFilterNode = () => {
    const activeFilters = [filterTitle, filterCompany, filterLocation, filterSalaryMin, filterSource].filter(f => f.trim() !== '');
    
    if (activeFilters.length === 0) return;

    if (editingNodeId) {
      setNodes((nds) => nds.map(node => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: 'Filter',
              filterCount: activeFilters.length,
              metadata: {
                filters: [
                  filterTitle && `Title: ${filterTitle}`,
                  filterCompany && `Company: ${filterCompany}`,
                  filterLocation && `Location: ${filterLocation}`,
                  filterSalaryMin && `Salary: ${filterSalaryMin}+`,
                  filterSource && filterSource !== 'any' && `Source: ${filterSource}`,
                ].filter(Boolean) as string[],
              },
            }
          };
        }
        return node;
      }));
      setEditingNodeId(null);
    } else {
      if (!pendingConnection) return;

      const existingFilterNodes = nodes.filter(n => n.data.type === 'filter');
      const newNodeId = `filter-${Date.now()}`;
      
      const sourceNode = nodes.find(n => n.id === pendingConnection.source);
      const xOffset = 300;
      const yOffset = existingFilterNodes.length * 100;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'filter',
        position: { 
          x: (sourceNode?.position.x || 250) + xOffset, 
          y: (sourceNode?.position.y || 250) + yOffset 
        },
        data: { 
          label: 'Filter', 
          type: 'filter',
          filterCount: activeFilters.length,
          metadata: {
            filters: [
              filterTitle && `Title: ${filterTitle}`,
              filterCompany && `Company: ${filterCompany}`,
              filterLocation && `Location: ${filterLocation}`,
              filterSalaryMin && `Salary: ${filterSalaryMin}+`,
              filterSource && filterSource !== 'any' && `Source: ${filterSource}`,
            ].filter(Boolean) as string[],
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);

      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${newNodeId}`,
        source: pendingConnection.source!,
        target: newNodeId,
        sourceHandle: pendingConnection.sourceHandle || null,
        targetHandle: pendingConnection.targetHandle || null,
      };
      setEdges((eds) => addEdge(newEdge, eds) as WorkflowEdge[]);

      setPendingConnection(null);
    }

    setShowFilter(false);
    setFilterTitle('');
    setFilterCompany('');
    setFilterLocation('');
    setFilterSalaryMin('');
    setFilterSource('');
  };

  const addOrUpdateJobsOutputNode = () => {
    const metadata = {
      schedule: jobsSchedule,
      maxJobs: jobsMaxJobs,
      notifications: jobsNotifications,
      retentionDays: jobsRetentionDays,
    };

    if (editingNodeId) {
      setNodes((nds) => nds.map(node => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              metadata,
            },
          };
        }
        if (node.data.type === 'jobs-output') {
          return {
            ...node,
            data: {
              ...node.data,
              metadata: {
                ...node.data.metadata,
                schedule: jobsSchedule,
              },
            },
          };
        }
        return node;
      }));
      setEditingNodeId(null);
    } else {
      if (!pendingConnection) return;

      const existingOutputNodes = nodes.filter(n => n.data.type === 'jobs-output');
      const newNodeId = `jobs-output-${Date.now()}`;
      
      const sourceNode = nodes.find(n => n.id === pendingConnection.source);
      const xOffset = 300;
      const yOffset = existingOutputNodes.length * 100;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'jobsOutput',
        position: { 
          x: (sourceNode?.position.x || 250) + xOffset, 
          y: (sourceNode?.position.y || 250) + yOffset 
        },
        data: { 
          label: 'Jobs Output', 
          type: 'jobs-output' as any,
          metadata,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${newNodeId}`,
        source: pendingConnection.source!,
        target: newNodeId,
        sourceHandle: pendingConnection.sourceHandle || null,
        targetHandle: pendingConnection.targetHandle || null,
      };
      setEdges((eds) => addEdge(newEdge, eds) as WorkflowEdge[]);

      setPendingConnection(null);
    }

    setShowJobsOutput(false);
    setJobsSchedule('daily-9am');
    setJobsMaxJobs(100);
    setJobsNotifications(true);
    setJobsRetentionDays(30);
  };

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowNode) => {
      // Prevent editing in read-only mode
      if (isReadOnly) return;
      
      // Don't edit trigger node
      if (node.data.type === 'trigger') {
        return;
      }
      
      if (node.data.type === 'filter') {
        setEditingNodeId(node.id);
        // Load existing filter data
        const filters = node.data.metadata?.filters || [];
        filters.forEach(filter => {
          if (filter.startsWith('Title:')) setFilterTitle(filter.replace('Title: ', ''));
          if (filter.startsWith('Company:')) setFilterCompany(filter.replace('Company: ', ''));
          if (filter.startsWith('Location:')) setFilterLocation(filter.replace('Location: ', ''));
          if (filter.startsWith('Salary:')) setFilterSalaryMin(filter.replace('Salary: ', '').replace('+', ''));
          if (filter.startsWith('Source:')) setFilterSource(filter.replace('Source: ', '').toLowerCase());
        });
        setShowFilter(true);
      } else if (node.data.type === 'job-source') {
        setEditingNodeId(node.id);
        // Load existing job source data
        if (node.data.metadata) {
          setSelectedJobSource(node.data.metadata.platform || '');
          setSelectedJobType(node.data.metadata.jobType || '');
          setSelectedLocation(node.data.metadata.location || '');
        }
        setShowJobSourcePopover(true);
      } else if (node.data.type === 'normalize-data') {
        setEditingNodeId(node.id);
        // Load existing normalize data
        if (node.data.metadata) {
          const mapping = node.data.metadata.fieldMapping;
          const format = node.data.metadata.dataFormat;
          const duplicates = node.data.metadata.removeDuplicates;
          const cleaning = node.data.metadata.textCleaning;
          
          if (mapping === 'Auto-detect Fields') setFieldMapping('auto');
          else if (mapping === 'Manual Mapping') setFieldMapping('manual');
          else if (mapping === 'Custom Schema') setFieldMapping('custom');
          
          if (format === 'JSON') setDataFormat('json');
          else if (format === 'CSV') setDataFormat('csv');
          else if (format === 'XML') setDataFormat('xml');
          
          if (duplicates === 'Yes') setRemoveDuplicates('yes');
          else if (duplicates === 'No') setRemoveDuplicates('no');
          
          if (cleaning === 'Standard') setTextCleaning('standard');
          else if (cleaning === 'Aggressive') setTextCleaning('aggressive');
          else if (cleaning === 'None') setTextCleaning('none');
        }
        setShowNormalise(true);
      } else if (node.data.type === 'jobs-output') {
        setEditingNodeId(node.id);
        if (node.data.metadata) {
          setJobsSchedule(node.data.metadata.schedule || 'daily-9am');
          setJobsMaxJobs(node.data.metadata.maxJobs || 100);
          setJobsNotifications(node.data.metadata.notifications !== false);
          setJobsRetentionDays(node.data.metadata.retentionDays || 30);
        }
        setShowJobsOutput(true);
      }
    },
    [isReadOnly],
  );

  const addOrUpdateJobSourceNode = () => {
    if (!selectedJobSource || !selectedJobType || !selectedLocation) return;

    const jobTypeMap: { [key: string]: 'linkedin' | 'remoteok' | 'naukri' | 'arbeitnow' | 'jobicy' } = {
      linkedin: 'linkedin',
      remoteok: 'remoteok',
      naukri: 'naukri',
      arbeitnow: 'arbeitnow',
      jobicy: 'jobicy',
    };

    const metadata = {
      platform: selectedJobSource,
      jobType: selectedJobType,
      location: selectedLocation,
    };

    if (editingNodeId) {
      // Update existing node
      setNodes((nds) => nds.map(node => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: selectedJobSource,
              jobType: jobTypeMap[selectedJobSource.toLowerCase()],
              metadata,
            },
          };
        }
        return node;
      }));
      setEditingNodeId(null);
    } else {
      // Create new node
      if (!pendingConnection) return;

      const existingJobNodes = nodes.filter(n => n.data.type === 'job-source');
      const newNodeId = `${selectedJobSource}-${Date.now()}`;
      
      const triggerNode = nodes.find(n => n.id === pendingConnection.source);
      const xOffset = 300;
      const yOffset = existingJobNodes.length * 100;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'jobSource',
        position: { 
          x: (triggerNode?.position.x || 250) + xOffset, 
          y: (triggerNode?.position.y || 250) + yOffset 
        },
        data: { 
          label: selectedJobSource, 
          type: 'job-source',
          jobType: jobTypeMap[selectedJobSource.toLowerCase()],
          metadata,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${newNodeId}`,
        source: pendingConnection.source!,
        target: newNodeId,
        sourceHandle: pendingConnection.sourceHandle || null,
        targetHandle: pendingConnection.targetHandle || null,
      };
      setEdges((eds) => addEdge(newEdge, eds) as WorkflowEdge[]);

      setPendingConnection(null);
    }

    setShowJobSourcePopover(false);
    setSelectedJobSource('');
    setSelectedJobType('');
    setSelectedLocation('');
  };

  const saveWorkflow = async (status: 'draft' | 'published') => {
    setIsSaving(true);
    
    const jobsOutputNode = nodes.find(n => n.data.type === 'jobs-output');
    const jobsConfig = jobsOutputNode?.data.metadata ? {
      retentionDays: jobsOutputNode.data.metadata.retentionDays || 30,
      maxJobs: jobsOutputNode.data.metadata.maxJobs || 100,
      notifications: jobsOutputNode.data.metadata.notifications !== false,
      notifyThreshold: 1,
      defaultSort: 'newest' as const,
      autoMarkReadDays: 0,
    } : undefined;

    const workflowData = {
      workflowId,
      title: workflowTitle,
      status,
      nodes,
      edges,
      jobsConfig,
    };

    try {
      if (id) {
        // Update existing workflow
        await api.updateWorkflow(workflowId, workflowData);
      } else {
        // Create new workflow
        await api.createWorkflow(workflowData);
      }

      setWorkflowStatus(status);
      
      // Set read-only mode if publishing
      if (status === 'published') {
        setIsReadOnly(true);
        // Automatically activate when publishing
        try {
          await api.activateWorkflow(workflowId);
        } catch (error) {
          console.warn('Failed to auto-activate workflow:', error);
          // Don't block the save if activation fails, but user might need to manually activate
        }
      }
      
      // Navigate to workflows list after successful save
      navigate('/workflows');
    } catch (error: any) {
      alert(error.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">{/* Header */}
      <header className="border-b border-gray-200 bg-white z-50 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/workflows" className="flex items-center gap-2">
            <img src="/logo.svg" alt="JobFlow" className="w-8 h-8 shadow-md shadow-purple-200 rounded-lg" />
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-bold rounded shadow-sm">
              BETA
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            {!isReadOnly && isEditingTitle ? (
              <input
                type="text"
                value={workflowTitle}
                onChange={(e) => setWorkflowTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                className="text-xl font-semibold px-2 py-1 bg-gray-50 border border-indigo-500 rounded-lg focus:outline-none text-gray-900"
                autoFocus
              />
            ) : (
              <h1
                className={`text-xl font-semibold text-gray-900 ${!isReadOnly ? 'cursor-pointer hover:text-indigo-600' : ''} transition-colors`}
                onClick={() => !isReadOnly && setIsEditingTitle(true)}
              >
                {workflowTitle}
              </h1>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              workflowStatus === 'published'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {workflowStatus === 'published' ? '● Published' : '○ Draft'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Anonymous Feedback Dialog */}
          <FeedbackDialog />

          <Link to="/workflows">
            <Button variant="outline" className="font-medium border-gray-300 text-gray-700 hover:bg-gray-50">
              <ArrowLeft size={16} className="mr-1" />
              Back
            </Button>
          </Link>
          {!isReadOnly && (
            <>
              <Button
                onClick={() => saveWorkflow('draft')}
                variant="outline"
                disabled={isSaving}
                className="font-medium border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={() => saveWorkflow('published')}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket size={16} className="mr-1" />
                    Publish
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700">
            <Lock size={18} />
            <span className="font-medium">This workflow is published and cannot be edited</span>
          </div>
          <Button
            onClick={() => setIsReadOnly(false)}
            size="sm"
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
          >
            <Pencil size={14} className="mr-1" />
            Enable Editing
          </Button>
        </div>
      )}

      <div className="flex-1">
      <Sheet open={showInitialPopover} onOpenChange={setShowInitialPopover}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">Create Workflow</SheetTitle>
            <SheetDescription className="text-base">Start by adding a job trigger node</SheetDescription>
          </SheetHeader>
          <div className="mt-8">
            <p className="text-sm text-gray-400 mb-6">
              Click the button below to add a Job Trigger node to your workflow.
            </p>
            <Button onClick={addJobTriggerNode} className="w-full h-11 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl transition-all">
              <Zap size={18} className="mr-2" />
              Add Job Trigger
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showNodeSelection} onOpenChange={setShowNodeSelection}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold">Select Node Type</SheetTitle>
            <SheetDescription className="text-base">Choose what type of node to add next</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-4">
            <Button 
              onClick={() => {
                setShowNodeSelection(false);
                setShowNormalise(true);
              }}
              className="w-full h-14 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <RefreshCw size={20} className="mr-4" />
              <div className="text-left">
                <div className="font-semibold">Normalize Data</div>
                <div className="text-xs opacity-90">Clean and standardize job listings</div>
              </div>
            </Button>
            
            <Button 
              onClick={() => {
                setShowNodeSelection(false);
                setShowFilter(true);
              }}
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <Filter size={20} className="mr-4" />
              <div className="text-left">
                <div className="font-semibold">Filter Data</div>
                <div className="text-xs opacity-90">Filter jobs by criteria</div>
              </div>
            </Button>
            
            <Button 
              onClick={() => {
                setShowNodeSelection(false);
                setShowJobsOutput(true);
              }}
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <Briefcase size={20} className="mr-4" />
              <div className="text-left">
                <div className="font-semibold">Jobs Output</div>
                <div className="text-xs opacity-90">Save jobs to My Jobs page</div>
              </div>
            </Button>

            {/* Show existing jobs output nodes */}
            {nodes.filter(n => n.data.type === 'jobs-output').length > 0 && (
              <>
                <div className="text-sm font-medium text-gray-500 pt-2">Or connect to existing:</div>
                {nodes.filter(n => n.data.type === 'jobs-output').map((outputNode) => (
                  <Button 
                    key={outputNode.id}
                    onClick={() => {
                      if (pendingConnection) {
                        const newEdge: WorkflowEdge = {
                          id: `edge-${pendingConnection.source}-${outputNode.id}`,
                          source: pendingConnection.source,
                          target: outputNode.id,
                          sourceHandle: pendingConnection.sourceHandle || null,
                          targetHandle: pendingConnection.targetHandle || null,
                        };
                        setEdges((eds) => addEdge(newEdge, eds) as WorkflowEdge[]);
                        setPendingConnection(null);
                      }
                      setShowNodeSelection(false);
                    }}
                    variant="outline"
                    className="w-full h-12 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 justify-start px-6"
                  >
                    <Briefcase size={18} className="mr-3 text-emerald-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-700">Jobs Output</div>
                      <div className="text-xs text-gray-500">
                        {outputNode.data.metadata?.schedule === 'daily-9am' ? 'Daily at 9 AM' : 
                         outputNode.data.metadata?.schedule === 'daily-6pm' ? 'Daily at 6 PM' : 'Weekly'}
                      </div>
                    </div>
                  </Button>
                ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showJobSourcePopover} onOpenChange={(open) => {
        setShowJobSourcePopover(open);
        if (!open) {
          setSelectedJobSource('');
          setSelectedJobType('');
          setSelectedLocation('');
        }
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">{editingNodeId ? 'Edit Job Source' : 'Add Job Source'}</SheetTitle>
            <SheetDescription className="text-base">Select a job platform and configure the job source</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Job Platform</label>
              <Select value={selectedJobSource} onValueChange={setSelectedJobSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a job platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">LinkedIn Jobs</SelectItem>
                  <SelectItem value="RemoteOK">RemoteOK (Remote)</SelectItem>
                  <SelectItem value="Naukri">Naukri Jobs</SelectItem>
                  <SelectItem value="Arbeitnow">Arbeitnow (Europe)</SelectItem>
                  <SelectItem value="Jobicy">Jobicy (Remote)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedJobSource && (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <label className="text-sm font-semibold text-gray-700">Job Type</label>
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedJobType && (
              <div className="space-y-2 animate-in fade-in-50 duration-200">
                <label className="text-sm font-semibold text-gray-700">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Locations</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Chennai">Chennai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedLocation && (
              <Button 
                onClick={addOrUpdateJobSourceNode}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium shadow-lg hover:shadow-xl transition-all animate-in fade-in-50 duration-200"
              >
                {editingNodeId ? 'Update Job Source' : 'Add Job Source Node'}
              </Button>
            )}

            {editingNodeId && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleDeleteRequest(editingNodeId);
                  setShowJobSourcePopover(false);
                }}
                className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showNormalise} onOpenChange={(open) => {
        setShowNormalise(open);
        if (!open) {
          setFieldMapping('auto');
          setDataFormat('json');
          setRemoveDuplicates('yes');
          setTextCleaning('standard');
        }
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">{editingNodeId ? 'Edit Normalize Data' : 'Configure Normalize Data'}</SheetTitle>
            <SheetDescription className="text-base">Set up how to normalize and clean the job data</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-6">

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Field Mapping</label>
                <Select value={fieldMapping} onValueChange={setFieldMapping}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select field mapping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect Fields</SelectItem>
                    <SelectItem value="manual">Manual Mapping</SelectItem>
                    <SelectItem value="custom">Custom Schema</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Data Format</label>
                <Select value={dataFormat} onValueChange={setDataFormat}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select output format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Remove Duplicates</label>
                <Select value={removeDuplicates} onValueChange={setRemoveDuplicates}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Remove duplicates?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Text Cleaning</label>
                <Select value={textCleaning} onValueChange={setTextCleaning}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cleaning level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={addOrUpdateNormaliseNode}
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {editingNodeId ? 'Update Normalize Node' : 'Add Normalize Node'}
            </Button>

            {editingNodeId && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleDeleteRequest(editingNodeId);
                  setShowNormalise(false);
                }}
                className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showFilter} onOpenChange={(open) => {
        setShowFilter(open);
        if (!open) {
          setEditingNodeId(null);
          setFilterTitle('');
          setFilterCompany('');
          setFilterLocation('');
          setFilterSalaryMin('');
          setFilterSource('');
        }
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">{editingNodeId ? 'Edit Filter' : 'Configure Filter'}</SheetTitle>
            <SheetDescription className="text-base">Set up filters to refine job listings (all fields are optional)</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-6">
            <div className="space-y-5">
              <p className="text-xs text-gray-400">
                Add filters to narrow down job listings. All fields are optional.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Title Contains (optional)</label>
                <input
                  type="text"
                  value={filterTitle}
                  onChange={(e) => setFilterTitle(e.target.value)}
                  placeholder="e.g., Software Engineer, React"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Company Contains (optional)</label>
                <input
                  type="text"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  placeholder="e.g., Google, Microsoft"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Location Contains (optional)</label>
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="e.g., Remote, Bangalore"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Minimum Salary (optional)</label>
                <input
                  type="text"
                  value={filterSalaryMin}
                  onChange={(e) => setFilterSalaryMin(e.target.value)}
                  placeholder="e.g., 100000, 50k"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Source (optional)</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Any source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Source</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="remoteok">RemoteOK</SelectItem>
                    <SelectItem value="naukri">Naukri</SelectItem>
                    <SelectItem value="arbeitnow">Arbeitnow</SelectItem>
                    <SelectItem value="jobicy">Jobicy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={addOrUpdateFilterNode}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {editingNodeId ? 'Update Filter' : 'Add Filter Node'}
            </Button>

            {editingNodeId && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleDeleteRequest(editingNodeId);
                  setShowFilter(false);
                }}
                className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showJobsOutput} onOpenChange={setShowJobsOutput}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {editingNodeId ? 'Edit Jobs Output' : 'Configure Jobs Output'}
            </SheetTitle>
            <SheetDescription className="text-base">Jobs will be saved to your My Jobs page</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock size={16} className="text-emerald-600" />
                  Schedule
                </label>
                <Select value={jobsSchedule} onValueChange={setJobsSchedule}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily-9am">Daily at 9 AM</SelectItem>
                    <SelectItem value="daily-6pm">Daily at 6 PM</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday 9 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Max Jobs to Store</label>
                <Select value={jobsMaxJobs.toString()} onValueChange={(v) => setJobsMaxJobs(parseInt(v))}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 jobs</SelectItem>
                    <SelectItem value="50">50 jobs</SelectItem>
                    <SelectItem value="100">100 jobs</SelectItem>
                    <SelectItem value="200">200 jobs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Retention Period</label>
                <Select value={jobsRetentionDays.toString()} onValueChange={(v) => setJobsRetentionDays(parseInt(v))}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">Browser Notifications</span>
                </div>
                <button
                  onClick={() => setJobsNotifications(!jobsNotifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    jobsNotifications ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      jobsNotifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <Button 
              onClick={addOrUpdateJobsOutputNode}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {editingNodeId ? 'Update Jobs Output' : 'Add Jobs Output'}
            </Button>

            {editingNodeId && (
              <Button 
                variant="outline"
                onClick={() => {
                  handleDeleteRequest(editingNodeId);
                  setShowJobsOutput(false);
                }}
                className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Node
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div style={{ width: '100%', height: '100%' }} className="bg-slate-50 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              style={{ background: '#f8fafc' }}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls className="!bg-white !border-gray-200 !rounded-lg !shadow-md [&>button]:!bg-white [&>button]:!border-gray-200 [&>button]:!text-gray-600 [&>button:hover]:!bg-gray-50" />
              <MiniMap 
                nodeColor="#6366f1"
                maskColor="rgba(255, 255, 255, 0.8)"
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              />
            </ReactFlow>
            
            {/* Empty State - Show button to add trigger when no nodes */}
            {nodes.length === 0 && !isReadOnly && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl text-center pointer-events-auto">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Start Building Your Workflow</h3>
                  <p className="text-gray-500 mb-6 max-w-xs">
                    Add a trigger node to start creating your job automation workflow
                  </p>
                  <Button 
                    onClick={() => setShowInitialPopover(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-200"
                  >
                    <Plus size={18} className="mr-1" />
                    Add Trigger Node
                  </Button>
                </div>
              </div>
            )}

            {/* Hint for node interaction */}
            {nodes.length > 0 && !isReadOnly && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-sm text-xs text-gray-500">
                💡 Click on a node to edit • Delete option available in settings
              </div>
            )}
          </>
        )}

        {/* Context Menu */}
        {contextMenu && !isReadOnly && (
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleDeleteRequest(contextMenu.nodeId)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 size={16} />
              Delete Node
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog?.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Node{deleteDialog && deleteDialog.nodeCount > 1 ? 's' : ''}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteDialog?.nodeId === 'job-trigger' ? (
                  <>This will delete the <strong>entire workflow</strong> including all {deleteDialog?.nodeCount} nodes. This action cannot be undone.</>
                ) : deleteDialog && deleteDialog.nodeCount > 1 ? (
                  <>This will delete <strong>{deleteDialog.nodeCount} nodes</strong> (including all connected downstream nodes). This action cannot be undone.</>
                ) : (
                  <>Are you sure you want to delete this node? This action cannot be undone.</>
                )}
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
      </div>
      </div>
    </div>
  );
}

export default Workflow;