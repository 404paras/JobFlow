import { Handle, Position } from '@xyflow/react';

interface FilterNodeProps {
  data: {
    label: string;
    filterCount?: number;
    metadata?: {
      filters?: string[];
    };
  };
}

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #f97316',
};

export const FilterNode = ({ data }: FilterNodeProps) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.875rem',
        minWidth: '160px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div>{data.label}</div>
      {data.metadata?.filters && data.metadata.filters.length > 0 && (
        <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.85, fontWeight: '400', lineHeight: '1.3' }}>
          {data.metadata.filters.map((filter, index) => (
            <div key={index}>{filter}</div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
