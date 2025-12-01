import { Handle, Position } from '@xyflow/react';
import { Linkedin, Globe, Building2, MapPin, Briefcase, Search, Rocket } from 'lucide-react';

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
  const themes = {
    linkedin: { 
      gradient: 'from-[#0077b5] to-[#00a0dc]',
      glow: 'shadow-[0_0_20px_rgba(0,119,181,0.3)]',
      icon: Linkedin
    },
    remoteok: { 
      gradient: 'from-emerald-500 to-teal-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      icon: Globe
    },
    naukri: { 
      gradient: 'from-red-500 to-rose-400',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      icon: Building2
    },
    google: { 
      gradient: 'from-blue-500 via-green-500 to-yellow-500',
      glow: 'shadow-[0_0_20px_rgba(66,133,244,0.3)]',
      icon: Search
    },
    wellfound: { 
      gradient: 'from-slate-800 to-slate-600',
      glow: 'shadow-[0_0_20px_rgba(0,0,0,0.3)]',
      icon: Rocket
    },
  };

  const theme = themes[data.jobType] || themes.remoteok;
  const Icon = theme.icon;

  return (
    <div className={`
      relative group
      bg-gradient-to-br ${theme.gradient}
      rounded-xl p-3 min-w-[140px]
      ${theme.glow}
      ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}
      transition-all duration-300 ease-out
      hover:scale-105 hover:shadow-xl
      cursor-pointer
    `}>
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white mb-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Icon size={14} />
          </div>
          <span className="font-semibold text-sm">{data.label}</span>
        </div>
        
        {data.metadata && (
          <div className="space-y-1 text-white/90 text-xs">
            {data.metadata.jobType && (
              <div className="flex items-center gap-1.5">
                <Briefcase size={10} className="opacity-70" />
                <span>{data.metadata.jobType}</span>
              </div>
            )}
            {data.metadata.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={10} className="opacity-70" />
                <span className="truncate max-w-[100px]">{data.metadata.location}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles with glow effect */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2 !border-current !-left-1.5 transition-transform hover:scale-125"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-current !-right-1.5 transition-transform hover:scale-125"
      />
    </div>
  );
};
