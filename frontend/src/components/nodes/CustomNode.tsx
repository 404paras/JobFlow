import { Handle, Position } from '@xyflow/react';

export type NodeData = {
  label: string;
  type: 'trigger' | 'job-source' | 'normalize-data' | 'filter' | 'daily-email';
  jobType?: 'linkedin' | 'indeed' | 'naukri';
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
    recipients?: string;
    schedule?: string;
    format?: string;
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
      indeed: { bg: '#2164f3', border: '#1a4db8' },
      naukri: { bg: '#ed1c24', border: '#b81519' },
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
