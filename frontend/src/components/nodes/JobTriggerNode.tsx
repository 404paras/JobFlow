import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface JobTriggerNodeProps {
  data: { label: string };
  selected?: boolean;
}

export const JobTriggerNode = ({ data, selected }: JobTriggerNodeProps) => {
  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-sm min-w-[100px]
      ${selected ? 'border-purple-500 shadow-purple-100' : 'border-gray-200'}
      transition-all duration-150 hover:shadow-md
    `}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-700">{data.label}</span>
      </div>
      <Handle 
        type="source" 
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-purple-500 !border-2 !border-white !-right-1"
      />
    </div>
  );
};
