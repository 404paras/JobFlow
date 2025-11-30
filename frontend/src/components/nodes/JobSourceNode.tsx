import { Handle, Position } from '@xyflow/react';

export type JobSourceType = 'linkedin' | 'indeed' | 'naukri';

interface JobSourceNodeProps {
  data: {
    label: string;
    jobType: JobSourceType;
    metadata?: {
      platform?: string;
      jobType?: string;
      location?: string;
    };
  };
}

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #6366f1',
};

export const JobSourceNode = ({ data }: JobSourceNodeProps) => {
  const colors = {
    linkedin: { bg: 'linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)', shadow: '0 4px 12px rgba(0, 119, 181, 0.3)' },
    indeed: { bg: 'linear-gradient(135deg, #2557a7 0%, #2164f3 100%)', shadow: '0 4px 12px rgba(33, 100, 243, 0.3)' },
    naukri: { bg: 'linear-gradient(135deg, #ed1c24 0%, #ff4757 100%)', shadow: '0 4px 12px rgba(237, 28, 36, 0.3)' },
  };

  return (
    <div
      style={{
        background: colors[data.jobType!].bg,
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.875rem',
        minWidth: '160px',
        textAlign: 'center',
        boxShadow: colors[data.jobType!].shadow,
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div>{data.label}</div>
      {data.metadata && (
        <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.85, fontWeight: '400', lineHeight: '1.3' }}>
          {data.metadata.jobType && <div>{data.metadata.jobType}</div>}
          {data.metadata.location && <div>{data.metadata.location}</div>}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
