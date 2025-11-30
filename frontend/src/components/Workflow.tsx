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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CustomNode, JobTriggerNode, JobSourceNode, NormalizeDataNode, FilterNode, DailyEmailNode, type NodeData } from './nodes';

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
  dailyEmail: DailyEmailNode,
};

const generateUniqueName = (): string => {
  const adjectives = ['Swift', 'Smart', 'Quick', 'Auto', 'Daily', 'Pro', 'Active', 'Fast', 'Easy', 'Prime'];
  const nouns = ['Finder', 'Hunter', 'Scout', 'Tracker', 'Seeker', 'Crawler', 'Stream', 'Flow', 'Sync', 'Bot'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} Job ${noun} ${num}`;
};

function Workflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const generateWorkflowId = () => `WF-${Date.now().toString(36).toUpperCase()}`;
  
  const [workflowId, setWorkflowId] = useState<string>(id || generateWorkflowId());
  const [workflowTitle, setWorkflowTitle] = useState<string>(() => id ? 'New Workflow' : generateUniqueName());
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'published'>('draft');
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
  const [showDailyEmail, setShowDailyEmail] = useState<boolean>(false);
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [emailSchedule, setEmailSchedule] = useState<string>('daily-9am');
  const [emailFormat, setEmailFormat] = useState<string>('html');
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);

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

  const onConnectStart = useCallback(
    (_event: unknown, params: { nodeId: string | null; handleType: string | null }) => {
      // Prevent connections in read-only mode
      if (isReadOnly) return;
      
      if (params.nodeId === 'job-trigger' && params.handleType === 'source') {
        setPendingConnection({ source: params.nodeId, target: '', sourceHandle: null, targetHandle: null });
        setShowJobSourcePopover(true);
      } else if (params.nodeId && params.handleType === 'source') {
        const sourceNode = nodes.find(n => n.id === params.nodeId);
        
        // Daily email is a terminal node - no connections allowed from it
        if (sourceNode?.data.type === 'daily-email') {
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

  const addOrUpdateDailyEmailNode = () => {
    if (!emailRecipients.trim()) return;

    const metadata = {
      recipients: emailRecipients || 'Not set',
      schedule: emailSchedule === 'daily-9am' ? 'Daily at 9 AM' : 
               emailSchedule === 'daily-6pm' ? 'Daily at 6 PM' : 
               emailSchedule === 'weekly' ? 'Weekly' : emailSchedule,
      format: emailFormat === 'html' ? 'HTML' : 
             emailFormat === 'plain' ? 'Plain Text' : 
             emailFormat === 'pdf' ? 'PDF Attachment' : emailFormat,
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

      const existingEmailNodes = nodes.filter(n => n.data.type === 'daily-email');
      const newNodeId = `daily-email-${Date.now()}`;
      
      const sourceNode = nodes.find(n => n.id === pendingConnection.source);
      const xOffset = 300;
      const yOffset = existingEmailNodes.length * 100;

      const newNode: WorkflowNode = {
        id: newNodeId,
        type: 'dailyEmail',
        position: { 
          x: (sourceNode?.position.x || 250) + xOffset, 
          y: (sourceNode?.position.y || 250) + yOffset 
        },
        data: { 
          label: 'Daily Email', 
          type: 'daily-email' as any,
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

    setShowDailyEmail(false);
    setEmailRecipients('');
    setEmailSchedule('daily-9am');
    setEmailFormat('html');
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
      } else if (node.data.type === 'daily-email') {
        setEditingNodeId(node.id);
        // Load existing email data
        if (node.data.metadata) {
          setEmailRecipients(node.data.metadata.recipients?.replace('Not set', '') || '');
          
          const schedule = node.data.metadata.schedule;
          if (schedule === 'Daily at 9 AM') setEmailSchedule('daily-9am');
          else if (schedule === 'Daily at 6 PM') setEmailSchedule('daily-6pm');
          else if (schedule === 'Weekly') setEmailSchedule('weekly');
          
          const format = node.data.metadata.format;
          if (format === 'HTML') setEmailFormat('html');
          else if (format === 'Plain Text') setEmailFormat('plain');
          else if (format === 'PDF Attachment') setEmailFormat('pdf');
        }
        setShowDailyEmail(true);
      }
    },
    [isReadOnly],
  );

  const addOrUpdateJobSourceNode = () => {
    if (!selectedJobSource || !selectedJobType || !selectedLocation) return;

    const jobTypeMap: { [key: string]: 'linkedin' | 'indeed' | 'naukri' } = {
      linkedin: 'linkedin',
      indeed: 'indeed',
      naukri: 'naukri',
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
    
    // Get email config from daily-email node if exists
    const emailNode = nodes.find(n => n.data.type === 'daily-email');
    const emailConfig = emailNode?.data.metadata ? {
      recipients: emailNode.data.metadata.recipients || '',
      schedule: emailNode.data.metadata.schedule === 'Daily at 9 AM' ? 'daily-9am' : 
                emailNode.data.metadata.schedule === 'Daily at 6 PM' ? 'daily-6pm' : 
                emailNode.data.metadata.schedule === 'Weekly' ? 'weekly' : 'daily-9am',
      format: emailNode.data.metadata.format === 'HTML' ? 'html' : 
              emailNode.data.metadata.format === 'Plain Text' ? 'plain' : 'html',
    } : undefined;

    const workflowData = {
      workflowId,
      title: workflowTitle,
      status,
      nodes,
      edges,
      emailConfig,
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">J</span>
            </div>
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
                ✏️
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

        <div className="flex items-center gap-3">
          <Link to="/workflows">
            <Button variant="outline" className="font-medium border-gray-300 text-gray-700 hover:bg-gray-50">
              ← Back
            </Button>
          </Link>
          {!isReadOnly && (
            <>
              <Button
                onClick={() => saveWorkflow('draft')}
                variant="outline"
                disabled={isSaving}
                className="font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                💾 Save
              </Button>
              <Button
                onClick={() => saveWorkflow('published')}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-200"
              >
                🚀 Publish
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700">
            <span className="text-lg">🔒</span>
            <span className="font-medium">This workflow is published and cannot be edited</span>
          </div>
          <Button
            onClick={() => setIsReadOnly(false)}
            size="sm"
            variant="outline"
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
          >
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
              🚀 Add Job Trigger
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
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <span className="mr-3 text-xl">🔄</span>
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
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <span className="mr-3 text-xl">🔍</span>
              <div className="text-left">
                <div className="font-semibold">Filter Data</div>
                <div className="text-xs opacity-90">Filter jobs by criteria</div>
              </div>
            </Button>
            
            <Button 
              onClick={() => {
                setShowNodeSelection(false);
                setShowDailyEmail(true);
              }}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg hover:shadow-xl transition-all justify-start px-6"
            >
              <span className="mr-3 text-xl">📧</span>
              <div className="text-left">
                <div className="font-semibold">Daily Email</div>
                <div className="text-xs opacity-90">Send automated email reports</div>
              </div>
            </Button>
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
                  <SelectItem value="Indeed">Indeed Jobs</SelectItem>
                  <SelectItem value="Naukri">Naukri Jobs</SelectItem>
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
                    <SelectItem value="indeed">Indeed</SelectItem>
                    <SelectItem value="naukri">Naukri</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
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
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showDailyEmail} onOpenChange={setShowDailyEmail}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{editingNodeId ? 'Edit Daily Email' : 'Configure Daily Email'}</SheetTitle>
            <SheetDescription className="text-base">Set up automated email delivery of job listings</SheetDescription>
          </SheetHeader>
          <div className="mt-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Recipients <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Schedule</label>
                <Select value={emailSchedule} onValueChange={setEmailSchedule}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily-9am">📅 Daily at 9 AM</SelectItem>
                    <SelectItem value="daily-6pm">🌆 Daily at 6 PM</SelectItem>
                    <SelectItem value="weekly">📆 Weekly (Monday 9 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Format</label>
                <Select value={emailFormat} onValueChange={setEmailFormat}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">🎨 HTML Email</SelectItem>
                    <SelectItem value="plain">📝 Plain Text</SelectItem>
                    <SelectItem value="pdf">📎 PDF Attachment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={addOrUpdateDailyEmailNode}
              disabled={!emailRecipients.trim()}
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingNodeId ? 'Update Email Node' : 'Add Email Node'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div style={{ width: '100%', height: '100%' }} className="bg-slate-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onNodeClick={onNodeClick}
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
        )}
      </div>
      </div>
    </div>
  );
}

export default Workflow;