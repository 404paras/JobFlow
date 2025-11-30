import { Handle, Position } from '@xyflow/react';

const handleStyle = {
  width: '12px',
  height: '12px',
  background: '#fff',
  border: '2px solid #764ba2',
};

export const JobTriggerNode = ({ data }: { data: { label: string } }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '600',
        fontSize: '0.9rem',
        minWidth: '140px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
        position: 'relative',
      }}
    >
      <div>⚡ {data.label}</div>
      <Handle type="source" position={Position.Right} style={handleStyle} id="trigger-source" />
    </div>
  );
};
