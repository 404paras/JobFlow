import { Handle, Position } from '@xyflow/react';
import { RefreshCw, FileText, Copy, Sparkles } from 'lucide-react';

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
  width: '10px',
  height: '10px',
  background: '#fff',
  border: '2px solid #8b5cf6',
};

export const NormalizeDataNode = ({ data }: NormalizeDataNodeProps) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.7rem',
        minWidth: '100px',
        maxWidth: '150px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div className="flex items-center justify-center gap-1 font-semibold mb-1">
        <RefreshCw size={12} />
        <span>Normalize</span>
      </div>
      {data.metadata && (
        <div style={{ fontSize: '0.55rem', opacity: 0.9, lineHeight: 1.3, textAlign: 'left' }}>
          {data.metadata.fieldMapping && (
            <div className="flex items-center gap-1">
              <FileText size={8} />
              <span>{data.metadata.fieldMapping}</span>
            </div>
          )}
          {data.metadata.dataFormat && (
            <div className="flex items-center gap-1">
              <FileText size={8} />
              <span>{data.metadata.dataFormat}</span>
            </div>
          )}
          {data.metadata.removeDuplicates && (
            <div className="flex items-center gap-1">
              <Copy size={8} />
              <span>Dedupe: {data.metadata.removeDuplicates}</span>
            </div>
          )}
          {data.metadata.textCleaning && (
            <div className="flex items-center gap-1">
              <Sparkles size={8} />
              <span>Clean: {data.metadata.textCleaning}</span>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
