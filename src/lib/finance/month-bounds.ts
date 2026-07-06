export type MonthBounds = {
  monthKey: string;
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
  monthParam: string;
};

function monthBoundsFromParts(year: number, month: number): MonthBounds {
  const monthKey = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;
  return {
    monthKey,
    monthStart: monthKey,
    monthEnd,
    monthLabel: `${year}年${month}月`,
    monthParam: `${year}-${String(month).padStart(2, '0')}`,
  };
}

export function currentMonthBounds(reference = new Date()): MonthBounds {
  return monthBoundsFromParts(reference.getFullYear(), reference.getMonth() + 1);
}

/** 解析 URL ?month=YYYY-MM，無效則回傳本月 */
export function parseMonthParam(param?: string | null): MonthBounds {
  if (!param) return currentMonthBounds();

  const match = param.trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) return currentMonthBounds();

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return currentMonthBounds();
  }

  return monthBoundsFromParts(year, month);
}

export function listSelectableMonths(count = 24, reference = new Date()): MonthBounds[] {
  const items: MonthBounds[] = [];
  let y = reference.getFullYear();
  let m = reference.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    items.push(monthBoundsFromParts(y, m));
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }

  return items;
}

export function financeHref(path: string, monthParam?: string | null): string {
  const current = currentMonthBounds().monthParam;
  if (!monthParam || monthParam === current) return path;
  return `${path}?month=${monthParam}`;
}
