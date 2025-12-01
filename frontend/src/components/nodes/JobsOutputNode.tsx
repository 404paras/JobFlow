import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Briefcase } from 'lucide-react';

interface JobsOutputNodeProps {
  data: {
    label: string;
    type: string;
    metadata?: {
      retentionDays?: number;
      maxJobs?: number;
      notifications?: boolean;
      schedule?: string;
    };
  };
  selected?: boolean;
}

const JobsOutputNode = memo(({ data, selected }: JobsOutputNodeProps) => {
  const metadata = data.metadata || {};
  const retentionDays = metadata.retentionDays || 30;

  return (
    <div className={`
      bg-white rounded-lg border-2 shadow-sm min-w-[100px]
      ${selected ? 'border-emerald-500 shadow-emerald-100' : 'border-gray-200'}
      transition-all duration-150 hover:shadow-md
    `}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
          <Briefcase size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">Jobs Output</span>
          <span className="text-[10px] text-gray-400">{retentionDays}d retention</span>
        </div>
      </div>
      <Handle 
        type="target" 
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white !-left-1"
      />
    </div>
  );
});

JobsOutputNode.displayName = 'JobsOutputNode';

export default JobsOutputNode;
