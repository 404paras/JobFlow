import { Handle, Position } from '@xyflow/react';
import { Linkedin, Globe, Building2, Search, Rocket } from 'lucide-react';

export type JobSourceType = 'linkedin' | 'remoteok' | 'naukri' | 'google' | 'wellfound';

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
  selected?: boolean;
}

export const JobSourceNode = ({ data, selected }: JobSourceNodeProps) => {
  const themes: Record<JobSourceType, { color: string; icon: typeof Linkedin }> = {
    linkedin: { color: 'bg-[#0077b5]', icon: Linkedin },
    remoteok: { color: 'bg-emerald-500', icon: Globe },
    naukri: { color: 'bg-red-500', icon: Building2 },
    google: { color: 'bg-blue-500', icon: Search },
    wellfound: { color: 'bg-slate-700', icon: Rocket },
  };

  const theme = themes[data.jobType] || themes.remoteok;
  const Icon = theme.icon;

  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-sm min-w-[110px]
      ${selected ? 'border-blue-500 shadow-blue-100' : 'border-gray-200'}
      transition-all duration-150 hover:shadow-md
    `}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`w-6 h-6 rounded ${theme.color} flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">{data.label}</span>
          {data.metadata?.jobType && (
            <span className="text-[10px] text-gray-400 truncate max-w-[70px]">{data.metadata.jobType}</span>
          )}
        </div>
      </div>
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white !-left-1"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white !-right-1"
      />
    </div>
  );
};
