import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface JobTriggerNodeProps {
  data: { label: string };
  selected?: boolean;
}

export const JobTriggerNode = ({ data, selected }: JobTriggerNodeProps) => {
  return (
    <div className={`
      relative group
      bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500
      rounded-xl p-4 min-w-[120px]
      shadow-[0_0_25px_rgba(139,92,246,0.4)]
      ${selected ? 'ring-2 ring-white ring-offset-2' : ''}
      transition-all duration-300 ease-out
      hover:scale-105 hover:shadow-[0_0_35px_rgba(139,92,246,0.5)]
      cursor-pointer
    `}>
      {/* Animated pulse ring */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 animate-pulse opacity-50" />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="p-2 bg-white/20 rounded-full">
          <Zap size={18} className="text-white" />
        </div>
        <span className="font-bold text-white text-sm tracking-wide">{data.label}</span>
      </div>

      {/* Source handle */}
      <Handle 
        type="source" 
        position={Position.Right}
        id="trigger-source"
        className="!w-4 !h-4 !bg-white !border-2 !border-purple-400 !-right-2 transition-transform hover:scale-125"
      />
    </div>
  );
};
