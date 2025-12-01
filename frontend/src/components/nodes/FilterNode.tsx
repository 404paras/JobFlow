import { Handle, Position } from '@xyflow/react';
import { Filter, Check } from 'lucide-react';

interface FilterNodeProps {
  data: {
    label: string;
    filterCount?: number;
    metadata?: {
      filters?: string[];
    };
  };
  selected?: boolean;
}

export const FilterNode = ({ data, selected }: FilterNodeProps) => {
  const filters = data.metadata?.filters || [];

  return (
    <div className={`
      relative group
      bg-gradient-to-br from-orange-400 to-amber-500
      rounded-xl p-3 min-w-[140px] max-w-[180px]
      shadow-[0_0_20px_rgba(251,146,60,0.3)]
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
            <Filter size={14} />
          </div>
          <span className="font-semibold text-sm">Filter</span>
          {filters.length > 0 && (
            <span className="ml-auto px-1.5 py-0.5 bg-white/20 rounded text-xs">
              {filters.length}
            </span>
          )}
        </div>
        
        {filters.length > 0 && (
          <div className="space-y-1 text-white/90 text-xs">
            {filters.slice(0, 3).map((filter, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Check size={10} className="opacity-70 flex-shrink-0" />
                <span className="truncate">{filter}</span>
              </div>
            ))}
            {filters.length > 3 && (
              <div className="text-white/70 text-[10px] pl-4">
                +{filters.length - 3} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-3 !h-3 !bg-white !border-2 !border-orange-400 !-left-1.5 transition-transform hover:scale-125"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-orange-400 !-right-1.5 transition-transform hover:scale-125"
      />
    </div>
  );
};
