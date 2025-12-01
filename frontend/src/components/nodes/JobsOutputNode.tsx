import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Briefcase, Clock, Bell, List } from 'lucide-react';

interface JobsOutputNodeProps {
  data: {
    label: string;
    type: string;
    metadata?: {
      retentionDays?: number;
      maxJobs?: number;
      notifications?: boolean;
      notifyThreshold?: number;
      schedule?: string;
      defaultSort?: string;
    };
  };
  selected?: boolean;
}

const JobsOutputNode = memo(({ data, selected }: JobsOutputNodeProps) => {
  const metadata = data.metadata || {};
  const retentionDays = metadata.retentionDays || 30;
  const maxJobs = metadata.maxJobs || 100;
  const notifications = metadata.notifications !== false;
  const schedule = metadata.schedule || 'daily-9am';

  const scheduleLabels: Record<string, string> = {
    'daily-9am': '9:00 AM',
    'daily-6pm': '6:00 PM',
    'weekly': 'Weekly (Mon)',
  };

  return (
    <div
      className={`relative min-w-[220px] rounded-2xl transition-all duration-300 ${
        selected
          ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl shadow-emerald-200/50'
          : 'shadow-lg hover:shadow-xl hover:shadow-emerald-100/50'
      }`}
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
            <Briefcase size={20} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 text-sm">Jobs Output</h3>
            <p className="text-xs text-emerald-600/80">Save to Platform</p>
          </div>
        </div>

        <div className="space-y-2 bg-white/60 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <Clock size={12} className="text-emerald-600" />
            <span className="text-emerald-700">Schedule: {scheduleLabels[schedule]}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <List size={12} className="text-emerald-600" />
            <span className="text-emerald-700">Max: {maxJobs === -1 ? 'Unlimited' : maxJobs} jobs</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Bell size={12} className={notifications ? 'text-emerald-600' : 'text-gray-400'} />
            <span className={notifications ? 'text-emerald-700' : 'text-gray-500'}>
              {notifications ? 'Notifications On' : 'Notifications Off'}
            </span>
          </div>
          <div className="text-xs text-emerald-600/70 pt-1 border-t border-emerald-200/50">
            Keep for {retentionDays} days
          </div>
        </div>
      </div>

      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 rounded-full opacity-60" />
    </div>
  );
});

JobsOutputNode.displayName = 'JobsOutputNode';

export default JobsOutputNode;
