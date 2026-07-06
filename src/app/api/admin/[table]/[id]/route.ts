import { NextRequest, NextResponse } from 'next/server';
import { getRecord, isValidTable } from '@/lib/admin/crud';
import { requirePermission } from '@/lib/auth/server';
import { tableActionPermission } from '@/lib/auth/permissions';

type RouteContext = { params: Promise<{ table: string; id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { table, id } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const permission = tableActionPermission(table, 'read');
  if (!permission) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const auth = await requirePermission(permission);
  if (!auth.authorized) {
    return NextResponse.json({ error: '無權限' }, { status: auth.user ? 403 : 401 });
  }

  const record = await getRecord(table, id);
  return NextResponse.json(record);
}
