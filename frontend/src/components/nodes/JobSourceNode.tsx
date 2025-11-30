import { Handle, Position } from '@xyflow/react';
import { Linkedin, Briefcase, Building2, MapPin, FileText } from 'lucide-react';

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
  width: '10px',
  height: '10px',
  background: '#fff',
  border: '2px solid #6366f1',
};

export const JobSourceNode = ({ data }: JobSourceNodeProps) => {
  const colors = {
    linkedin: { bg: 'linear-gradient(135deg, #0077b5 0%, #00a0dc 100%)', shadow: '0 2px 8px rgba(0, 119, 181, 0.3)' },
    indeed: { bg: 'linear-gradient(135deg, #2557a7 0%, #2164f3 100%)', shadow: '0 2px 8px rgba(33, 100, 243, 0.3)' },
    naukri: { bg: 'linear-gradient(135deg, #ed1c24 0%, #ff4757 100%)', shadow: '0 2px 8px rgba(237, 28, 36, 0.3)' },
  };

  const getIcon = () => {
    switch (data.jobType) {
      case 'linkedin': return <Linkedin size={12} />;
      case 'indeed': return <Briefcase size={12} />;
      case 'naukri': return <Building2 size={12} />;
      default: return <Briefcase size={12} />;
    }
  };

  return (
    <div
      style={{
        background: colors[data.jobType!].bg,
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: '500',
        fontSize: '0.7rem',
        minWidth: '100px',
        maxWidth: '140px',
        textAlign: 'center',
        boxShadow: colors[data.jobType!].shadow,
        cursor: 'pointer',
        transition: 'transform 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div className="flex items-center justify-center gap-1 font-semibold mb-1">
        {getIcon()}
        <span>{data.label}</span>
      </div>
      {data.metadata && (
        <div style={{ fontSize: '0.55rem', opacity: 0.9, lineHeight: 1.3 }}>
          {data.metadata.jobType && (
            <div className="flex items-center gap-1 justify-center">
              <FileText size={8} />
              <span>{data.metadata.jobType}</span>
            </div>
          )}
          {data.metadata.location && (
            <div className="flex items-center gap-1 justify-center">
              <MapPin size={8} />
              <span>{data.metadata.location}</span>
            </div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
};
