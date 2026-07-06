import Link from 'next/link';

type PaginationLinksProps = {
  basePath: string;
  page: number;
  totalPages: number;
  pageParam?: string;
  query?: Record<string, string | undefined>;
};

export function PaginationLinks({
  basePath,
  page,
  totalPages,
  pageParam = 'page',
  query,
}: PaginationLinksProps) {
  if (totalPages <= 1) return null;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value && key !== pageParam) params.set(key, value);
      }
    }
    if (targetPage > 1) params.set(pageParam, String(targetPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="text-orange-600 hover:underline">
          上一頁
        </Link>
      ) : (
        <span className="text-gray-300">上一頁</span>
      )}
      <span className="text-gray-500">
        第 {page} / {totalPages} 頁
      </span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="text-orange-600 hover:underline">
          下一頁
        </Link>
      ) : (
        <span className="text-gray-300">下一頁</span>
      )}
    </div>
  );
}
