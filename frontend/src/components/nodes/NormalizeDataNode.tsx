import { Handle, Position } from '@xyflow/react';
import { RefreshCw, Copy, Sparkles } from 'lucide-react';

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
  selected?: boolean;
}

export const NormalizeDataNode = ({ data, selected }: NormalizeDataNodeProps) => {
  return (
    <div className={`
      relative group
      bg-gradient-to-br from-violet-400 to-purple-500
      rounded-xl p-3 min-w-[140px] max-w-[170px]
      shadow-[0_0_20px_rgba(139,92,246,0.3)]
      ${selected ? 'ring-2 ring-white ring-offset-2' : ''}
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
            <RefreshCw size={14} />
          </div>
          <span className="font-semibold text-sm">Normalize</span>
        </div>
        
        {data.metadata && (
          <div className="space-y-1 text-white/90 text-xs">
            {data.metadata.removeDuplicates === 'Yes' && (
              <div className="flex items-center gap-1.5">
                <Copy size={10} className="opacity-70" />
                <span>Remove Duplicates</span>
              </div>
            )}
            {data.metadata.textCleaning && (
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="opacity-70" />
                <span>{data.metadata.textCleaning} Clean</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2 !border-purple-400 !-left-1.5 transition-transform hover:scale-125"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-purple-400 !-right-1.5 transition-transform hover:scale-125"
      />
    </div>
  );
};
