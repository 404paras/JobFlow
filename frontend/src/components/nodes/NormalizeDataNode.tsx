import { Handle, Position } from '@xyflow/react';
import { RefreshCw } from 'lucide-react';

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
  const features = [];
  if (data.metadata?.removeDuplicates === 'Yes') features.push('Dedup');
  if (data.metadata?.textCleaning) features.push('Clean');

  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-sm min-w-[100px]
      ${selected ? 'border-violet-500 shadow-violet-100' : 'border-gray-200'}
      transition-all duration-150 hover:shadow-md
    `}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded bg-violet-500 flex items-center justify-center">
          <RefreshCw size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">Normalize</span>
          {features.length > 0 && (
            <span className="text-[10px] text-gray-400">{features.join(', ')}</span>
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
