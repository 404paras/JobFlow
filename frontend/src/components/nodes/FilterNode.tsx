import { Handle, Position } from '@xyflow/react';
import { Filter } from 'lucide-react';

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
  width: '10px',
  height: '10px',
  background: '#fff',
  border: '2px solid #f97316',
};

export const FilterNode = ({ data }: FilterNodeProps) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.7rem',
        minWidth: '100px',
        maxWidth: '160px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div className="flex items-center justify-center gap-1 font-semibold mb-1">
        <Filter size={12} />
        <span>Filter</span>
      </div>
      {data.metadata?.filters && data.metadata.filters.length > 0 && (
        <div style={{ fontSize: '0.55rem', opacity: 0.9, lineHeight: 1.3, textAlign: 'left' }}>
          {data.metadata.filters.map((filter, index) => (
            <div key={index} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              • {filter}
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
