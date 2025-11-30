import { Handle, Position } from '@xyflow/react';

interface NormalizeDataNodeProps {
  data: {
    label: string;
    metadata?: {
      fieldMapping?: string;
      dataFormat?: string;
      removeDuplicates?: string;
      textCleaning?: string;
    };
  };
}

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #8b5cf6',
};

export const NormalizeDataNode = ({ data }: NormalizeDataNodeProps) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.875rem',
        minWidth: '160px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
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
          {data.metadata.fieldMapping && <div>Mapping: {data.metadata.fieldMapping}</div>}
          {data.metadata.dataFormat && <div>Format: {data.metadata.dataFormat}</div>}
          {data.metadata.removeDuplicates && <div>Remove Duplicates: {data.metadata.removeDuplicates}</div>}
          {data.metadata.textCleaning && <div>Text Cleaning: {data.metadata.textCleaning}</div>}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
