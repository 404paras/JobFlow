import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

const handleStyle = {
  width: '10px',
  height: '10px',
  background: '#fff',
  border: '2px solid #764ba2',
};

export const JobTriggerNode = ({ data }: { data: { label: string } }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '600',
        fontSize: '0.75rem',
        minWidth: '100px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
        position: 'relative',
      }}
    >
      <div className="flex items-center justify-center gap-1">
        <Zap size={14} />
        <span>{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} id="trigger-source" />
    </div>
  );
};
