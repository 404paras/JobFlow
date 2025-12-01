import { Handle, Position } from '@xyflow/react';
import { Filter } from 'lucide-react';

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
      bg-white rounded-lg border-2 shadow-sm min-w-[100px]
      ${selected ? 'border-orange-500 shadow-orange-100' : 'border-gray-200'}
      transition-all duration-150 hover:shadow-md
    `}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center">
          <Filter size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">Filter</span>
          {filters.length > 0 && (
            <span className="text-[10px] text-gray-400">{filters.length} rules</span>
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
