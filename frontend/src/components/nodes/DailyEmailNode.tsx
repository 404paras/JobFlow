import { Handle, Position } from '@xyflow/react';
import { Mail, Clock, FileType } from 'lucide-react';

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
  width: '10px',
  height: '10px',
  background: '#fff',
  border: '2px solid #f59e0b',
};

export const DailyEmailNode = ({ data }: DailyEmailNodeProps) => {
  const formatSchedule = (schedule: string) => {
    if (schedule === 'Daily at 9 AM') return '9 AM';
    if (schedule === 'Daily at 6 PM') return '6 PM';
    if (schedule === 'Weekly') return 'Weekly';
    return schedule;
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.7rem',
        minWidth: '100px',
        maxWidth: '160px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div className="flex items-center justify-center gap-1 font-semibold mb-1">
        <Mail size={12} />
        <span>Email</span>
      </div>
      {data.metadata && (
        <div style={{ fontSize: '0.55rem', opacity: 0.9, lineHeight: 1.3, wordBreak: 'break-all' }}>
          {data.metadata.recipients && (
            <div className="flex items-center gap-1 justify-center">
              <Mail size={8} />
              <span>{data.metadata.recipients}</span>
            </div>
          )}
          {data.metadata.schedule && (
            <div className="flex items-center gap-1 justify-center">
              <Clock size={8} />
              <span>{formatSchedule(data.metadata.schedule)}</span>
            </div>
          )}
          {data.metadata.format && (
            <div className="flex items-center gap-1 justify-center">
              <FileType size={8} />
              <span>{data.metadata.format}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
