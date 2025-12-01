import { Handle, Position } from '@xyflow/react';

export type NodeData = {
  label: string;
  type: 'trigger' | 'job-source' | 'normalize-data' | 'filter' | 'jobs-output';
  jobType?: 'linkedin' | 'remoteok' | 'naukri' | 'arbeitnow' | 'jobicy';
  filterCount?: number;
  metadata?: {
    platform?: string;
    jobType?: string;
    location?: string;
    fieldMapping?: string;
    dataFormat?: string;
    removeDuplicates?: string;
    textCleaning?: string;
    filters?: string[];
    schedule?: string;
    format?: string;
    maxJobs?: number;
    notifications?: boolean;
    retentionDays?: number;
  };
};

export const CustomNode = ({ data }: { data: NodeData }) => {
  const getNodeStyle = () => {
    if (data.type === 'trigger') {
      return {
        background: '#10b981',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        border: '2px solid #059669',
        fontWeight: '600',
        minWidth: '150px',
        textAlign: 'center' as const,
      };
    }
    
    const colors = {
      linkedin: { bg: '#0077b5', border: '#005582' },
      remoteok: { bg: '#10b981', border: '#059669' },
      naukri: { bg: '#ed1c24', border: '#b81519' },
      arbeitnow: { bg: '#f97316', border: '#c2410c' },
      jobicy: { bg: '#06b6d4', border: '#0891b2' },
    };
    
    const color = colors[data.jobType || 'linkedin'];
    
    return {
      background: color.bg,
      color: 'white',
      padding: '15px 25px',
      borderRadius: '8px',
      border: `2px solid ${color.border}`,
      fontWeight: '600',
      minWidth: '150px',
      textAlign: 'center' as const,
    };
  };

  return (
    <div style={getNodeStyle()}>
      {data.type === 'trigger' && (
        <Handle type="source" position={Position.Right} />
      )}
      {data.type === 'job-source' && (
        <Handle type="target" position={Position.Left} />
      )}
      <div>{data.label}</div>
    </div>
  );
};
