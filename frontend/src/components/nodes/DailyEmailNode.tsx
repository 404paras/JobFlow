import { Handle, Position } from '@xyflow/react';

interface DailyEmailNodeProps {
  data: {
    label: string;
    metadata?: {
      recipients?: string;
      schedule?: string;
      format?: string;
    };
  };
}

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #f59e0b',
};

export const DailyEmailNode = ({ data }: DailyEmailNodeProps) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.875rem',
        minWidth: '160px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div>📧 {data.label}</div>
      {data.metadata && (
        <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.85, fontWeight: '400', lineHeight: '1.3' }}>
          {data.metadata.recipients && <div>To: {data.metadata.recipients}</div>}
          {data.metadata.schedule && <div>{data.metadata.schedule}</div>}
        </div>
      )}
      {/* No source handle - this is a terminal node */}
    </div>
  );
};
