/** 香港時區（UTC+8）日期工具 */

const TZ = 'Asia/Hong_Kong';

export function hkDayKey(date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

export function hkMonthKey(date = new Date()): string {
  return hkDayKey(date).slice(0, 7);
}

export function timestampToHkDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

export function timestampToHkMonthKey(iso: string): string {
  return timestampToHkDayKey(iso).slice(0, 7);
}

export function hkDayStartIso(dayKey: string): string {
  return `${dayKey}T00:00:00+08:00`;
}

export function hkMonthStartIso(monthKey: string): string {
  return `${monthKey}-01T00:00:00+08:00`;
}

export function hkDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return `${m}/${d}`;
}

export function hkMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${y}年${m}月`;
}

/** 含今天共 count 天的 dayKey（由舊到新） */
export function lastHkDayKeys(count: number): string[] {
  const keys: string[] = [];
  const anchor = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    keys.push(hkDayKey(d));
  }
  return keys;
}

/** 含本月共 count 個月的 monthKey（由舊到新） */
export function lastHkMonthKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;

  for (let i = 0; i < count; i++) {
    keys.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return keys;
}

export function currentHkMonthBounds() {
  const monthKey = hkMonthKey();
  const [y, m] = monthKey.split('-').map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  return {
    monthKey,
    monthLabel: hkMonthLabel(monthKey),
    monthStartIso: hkMonthStartIso(monthKey),
    monthEndIso: `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00+08:00`,
  };
}

export function currentHkDayBounds() {
  const dayKey = hkDayKey();
  const start = new Date(hkDayStartIso(dayKey));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    dayKey,
    dayStartIso: start.toISOString(),
    dayEndIso: end.toISOString(),
  };
}
