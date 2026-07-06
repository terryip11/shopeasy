import { getAuditLogs } from '@/lib/admin/merchant-actions';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const logs = await getAuditLogs(100);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">審計日誌</h1>
      <p className="mb-6 text-sm text-gray-500">記錄全權管理員的敏感操作</p>

      {logs.length === 0 ? (
        <div className="rounded-xl bg-white px-4 py-12 text-center text-gray-500 shadow dark:bg-gray-900">
          暫無日誌
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {logs.map(
              (log: {
                id: string;
                created_at: string;
                action: string;
                target_type: string | null;
                target_id: string | null;
                details: unknown;
              }) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString('zh-TW')}
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {log.action}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {log.target_type}/{log.target_id?.slice(0, 8)}
                  </p>
                  <p className="mt-2 break-all text-xs text-gray-500">
                    {JSON.stringify(log.details)}
                  </p>
                </article>
              )
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl bg-white shadow md:block dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">時間</th>
                  <th className="px-4 py-3 text-left">操作</th>
                  <th className="px-4 py-3 text-left">目標</th>
                  <th className="px-4 py-3 text-left">詳情</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {logs.map(
                  (log: {
                    id: string;
                    created_at: string;
                    action: string;
                    target_type: string | null;
                    target_id: string | null;
                    details: unknown;
                  }) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(log.created_at).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                      <td className="px-4 py-3 text-xs">
                        {log.target_type}/{log.target_id?.slice(0, 8)}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
