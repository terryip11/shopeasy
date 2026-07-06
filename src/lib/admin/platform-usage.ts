import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  currentHkDayBounds,
  currentHkMonthBounds,
  hkDayLabel,
  hkMonthLabel,
  lastHkDayKeys,
  lastHkMonthKeys,
  timestampToHkDayKey,
  timestampToHkMonthKey,
} from '@/lib/time/hong-kong';

export type UsagePeriodCounts = {
  newSignups: number;
  loginActive: number;
  orderActive: number;
};

export type DailyUsageRow = UsagePeriodCounts & {
  day: string;
  dayLabel: string;
};

export type MonthlyUsageRow = UsagePeriodCounts & {
  month: string;
  monthLabel: string;
};

export type PlatformUsageStats = {
  totalUsers: number;
  today: UsagePeriodCounts;
  month: UsagePeriodCounts & { label: string };
  dailySeries: DailyUsageRow[];
  monthlySeries: MonthlyUsageRow[];
  generatedAt: string;
};

function emptyCounts(): UsagePeriodCounts {
  return { newSignups: 0, loginActive: 0, orderActive: 0 };
}

function initDayMap(keys: string[]): Map<string, UsagePeriodCounts> {
  return new Map(keys.map((k) => [k, emptyCounts()]));
}

function initMonthMap(keys: string[]): Map<string, UsagePeriodCounts> {
  return new Map(keys.map((k) => [k, emptyCounts()]));
}

async function listAuthUsersLastSignIn(): Promise<
  Array<{ id: string; last_sign_in_at?: string | null }>
> {
  const supabase = createAdminClient();
  const users: Array<{ id: string; last_sign_in_at?: string | null }> = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      users.push({ id: u.id, last_sign_in_at: u.last_sign_in_at });
    }
    if (data.users.length < 1000) break;
    page += 1;
    if (page > 50) break;
  }

  return users;
}

export async function getPlatformUsageStats(): Promise<PlatformUsageStats> {
  const supabase = createAdminClient();
  const dayBounds = currentHkDayBounds();
  const monthBounds = currentHkMonthBounds();
  const dailyKeys = lastHkDayKeys(30);
  const monthlyKeys = lastHkMonthKeys(12);
  const seriesStartIso = `${dailyKeys[0]}T00:00:00+08:00`;

  const dailyMap = initDayMap(dailyKeys);
  const monthlyMap = initMonthMap(monthlyKeys);

  const [{ count: totalUsers }, profilesRes, ordersRes, authUsers] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, created_at').gte('created_at', seriesStartIso),
    supabase.from('orders').select('user_id, created_at').gte('created_at', seriesStartIso),
    listAuthUsersLastSignIn(),
  ]);

  const today = emptyCounts();
  const month = emptyCounts();

  for (const row of (profilesRes.data || []) as { created_at: string }[]) {
    const day = timestampToHkDayKey(row.created_at);
    const monthKey = timestampToHkMonthKey(row.created_at);

    if (dailyMap.has(day)) dailyMap.get(day)!.newSignups += 1;
    if (monthlyMap.has(monthKey)) monthlyMap.get(monthKey)!.newSignups += 1;
    if (day === dayBounds.dayKey) today.newSignups += 1;
    if (monthKey === monthBounds.monthKey) month.newSignups += 1;
  }

  const orderUsersByDay = new Map<string, Set<string>>();
  const orderUsersByMonth = new Map<string, Set<string>>();
  const todayOrderUsers = new Set<string>();
  const monthOrderUsers = new Set<string>();

  for (const row of (ordersRes.data || []) as { user_id: string; created_at: string }[]) {
    const day = timestampToHkDayKey(row.created_at);
    const monthKey = timestampToHkMonthKey(row.created_at);

    if (dailyMap.has(day)) {
      if (!orderUsersByDay.has(day)) orderUsersByDay.set(day, new Set());
      orderUsersByDay.get(day)!.add(row.user_id);
    }
    if (monthlyMap.has(monthKey)) {
      if (!orderUsersByMonth.has(monthKey)) orderUsersByMonth.set(monthKey, new Set());
      orderUsersByMonth.get(monthKey)!.add(row.user_id);
    }
    if (day === dayBounds.dayKey) todayOrderUsers.add(row.user_id);
    if (monthKey === monthBounds.monthKey) monthOrderUsers.add(row.user_id);
  }

  for (const [day, users] of orderUsersByDay) {
    dailyMap.get(day)!.orderActive = users.size;
  }
  for (const [monthKey, users] of orderUsersByMonth) {
    monthlyMap.get(monthKey)!.orderActive = users.size;
  }

  today.orderActive = todayOrderUsers.size;
  month.orderActive = monthOrderUsers.size;

  const loginUsersByDay = new Map<string, Set<string>>();
  const loginUsersByMonth = new Map<string, Set<string>>();
  const todayLoginUsers = new Set<string>();
  const monthLoginUsers = new Set<string>();

  for (const user of authUsers) {
    if (!user.last_sign_in_at) continue;
    const day = timestampToHkDayKey(user.last_sign_in_at);
    const monthKey = timestampToHkMonthKey(user.last_sign_in_at);

    if (dailyMap.has(day)) {
      if (!loginUsersByDay.has(day)) loginUsersByDay.set(day, new Set());
      loginUsersByDay.get(day)!.add(user.id);
    }
    if (monthlyMap.has(monthKey)) {
      if (!loginUsersByMonth.has(monthKey)) loginUsersByMonth.set(monthKey, new Set());
      loginUsersByMonth.get(monthKey)!.add(user.id);
    }
    if (day === dayBounds.dayKey) todayLoginUsers.add(user.id);
    if (monthKey === monthBounds.monthKey) monthLoginUsers.add(user.id);
  }

  for (const [day, users] of loginUsersByDay) {
    dailyMap.get(day)!.loginActive = users.size;
  }
  for (const [monthKey, users] of loginUsersByMonth) {
    monthlyMap.get(monthKey)!.loginActive = users.size;
  }

  today.loginActive = todayLoginUsers.size;
  month.loginActive = monthLoginUsers.size;

  const dailySeries: DailyUsageRow[] = dailyKeys.map((day) => ({
    day,
    dayLabel: hkDayLabel(day),
    ...dailyMap.get(day)!,
  }));

  const monthlySeries: MonthlyUsageRow[] = monthlyKeys.map((monthKey) => ({
    month: monthKey,
    monthLabel: hkMonthLabel(monthKey),
    ...monthlyMap.get(monthKey)!,
  }));

  return {
    totalUsers: totalUsers ?? 0,
    today,
    month: { ...month, label: monthBounds.monthLabel },
    dailySeries,
    monthlySeries,
    generatedAt: new Date().toISOString(),
  };
}
