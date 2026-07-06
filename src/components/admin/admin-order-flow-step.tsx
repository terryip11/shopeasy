import type { FlowStepState } from '@/lib/admin/order-trace';

const STATE_STYLES: Record<FlowStepState, string> = {
  done: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
  active: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  pending: 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  skipped: 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-800/50 dark:border-gray-800 dark:text-gray-500',
  na: 'bg-transparent border-transparent text-gray-300 dark:text-gray-600',
};

const STATE_ICONS: Record<FlowStepState, string> = {
  done: '✓',
  active: '●',
  pending: '○',
  warning: '!',
  skipped: '—',
  na: '·',
};

function fmtTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('zh-HK', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminOrderFlowStep({
  label,
  state,
  detail,
  at,
}: {
  label: string;
  state: FlowStepState;
  detail: string | null;
  at: string | null;
}) {
  const time = fmtTime(at);

  return (
    <div
      className={`min-w-[5.5rem] rounded-lg border px-2 py-1.5 text-center ${STATE_STYLES[state]}`}
      title={[detail, time].filter(Boolean).join(' · ') || label}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-none">{STATE_ICONS[state]}</p>
      {detail && (
        <p className="mt-1 line-clamp-2 text-[10px] leading-tight opacity-90">{detail}</p>
      )}
      {time && <p className="mt-0.5 text-[10px] opacity-70">{time}</p>}
    </div>
  );
}
