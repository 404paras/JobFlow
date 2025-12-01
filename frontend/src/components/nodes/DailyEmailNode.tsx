import { Handle, Position } from '@xyflow/react';
import { Mail, Clock, FileType, User } from 'lucide-react';

interface DailyEmailNodeProps {
  data: {
    label: string;
    metadata?: {
      recipients?: string;
      schedule?: string;
      format?: string;
    };
  };
  selected?: boolean;
}

export const DailyEmailNode = ({ data, selected }: DailyEmailNodeProps) => {
  const formatSchedule = (schedule: string) => {
    if (schedule === 'Daily at 9 AM' || schedule === 'daily-9am') return '9:00 AM';
    if (schedule === 'Daily at 6 PM' || schedule === 'daily-6pm') return '6:00 PM';
    if (schedule === 'Weekly' || schedule === 'weekly') return 'Weekly';
    return schedule;
  };

  const formatEmail = (email: string) => {
    if (email.length > 20) {
      return email.substring(0, 18) + '...';
    }
    return email;
  };

  return (
    <div className={`
      relative group
      bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400
      rounded-xl p-3 min-w-[150px] max-w-[180px]
      shadow-[0_0_25px_rgba(251,191,36,0.4)]
      ${selected ? 'ring-2 ring-white ring-offset-2' : ''}
      transition-all duration-300 ease-out
      hover:scale-105 hover:shadow-[0_0_35px_rgba(251,191,36,0.5)]
      cursor-pointer
    `}>
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-white mb-2">
          <div className="p-1.5 bg-white/25 rounded-lg shadow-inner">
            <Mail size={14} />
          </div>
          <span className="font-bold text-sm">Daily Email</span>
        </div>
        
        {data.metadata && (
          <div className="space-y-1.5 text-white/95 text-xs">
            {data.metadata.recipients && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                <User size={10} className="opacity-80 flex-shrink-0" />
                <span className="truncate" title={data.metadata.recipients}>
                  {formatEmail(data.metadata.recipients)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              {data.metadata.schedule && (
                <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 flex-1">
                  <Clock size={10} className="opacity-80" />
                  <span>{formatSchedule(data.metadata.schedule)}</span>
                </div>
              )}
              {data.metadata.format && (
                <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                  <FileType size={10} className="opacity-80" />
                  <span className="uppercase text-[10px] font-semibold">{data.metadata.format}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Target handle - accepts multiple connections */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-4 !h-4 !bg-white !border-2 !border-amber-400 !-left-2 transition-transform hover:scale-125"
      />
    </div>
  );
};
