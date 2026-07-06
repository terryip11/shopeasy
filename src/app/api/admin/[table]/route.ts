import { NextRequest, NextResponse } from 'next/server';
import {
  getTableData,
  getTableSchema,
  createRecord,
  deleteRecord,
  updateRecord,
  isValidTable,
} from '@/lib/admin/crud';
import { requirePermission } from '@/lib/auth/server';
import { tableActionPermission } from '@/lib/auth/permissions';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ table: string }> };

async function checkTablePermission(
  table: string,
  action: 'read' | 'create' | 'update' | 'delete'
) {
  const permission = tableActionPermission(table, action);
  if (!permission) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }
  const auth = await requirePermission(permission);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: '無權限執行此操作' },
      { status: auth.user ? 403 : 401 }
    );
  }
  return null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const ip = getClientIp(_request);
  const limited = await rateLimit(`admin:read:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `請求過於頻繁，請 ${limited.retryAfterSec} 秒後再試` },
      { status: 429 }
    );
  }

  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const denied = await checkTablePermission(table, 'read');
  if (denied) return denied;

  const [data, schema] = await Promise.all([getTableData(table), getTableSchema(table)]);
  return NextResponse.json({ data, schema });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const denied = await checkTablePermission(table, 'create');
  if (denied) return denied;

  try {
    const body = await request.json();
    const record = await createRecord(table, body);
    return NextResponse.json(record);
  } catch (err) {
    console.error(`[admin] 建立 ${table} 失敗:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const denied = await checkTablePermission(table, 'update');
  if (denied) return denied;

  try {
    const body = await request.json();
    const { id, ...record } = body;
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }

    const updated = await updateRecord(table, id, record);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`[admin] 更新 ${table} 失敗:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { table } = await context.params;
  if (!isValidTable(table)) {
    return NextResponse.json({ error: '無效的資料表' }, { status: 400 });
  }

  const denied = await checkTablePermission(table, 'delete');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  await deleteRecord(table, id);
  return NextResponse.json({ success: true });
}
