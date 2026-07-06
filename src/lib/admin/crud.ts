import 'server-only';

/**
 * 動態 Supabase CRUD — 僅供 API Route 使用
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { TableName } from './tables';
import { isValidTable } from './tables';

export type { TableName } from './tables';
export { isValidTable } from './tables';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyToNull(value: unknown) {
  if (value === '' || value === undefined) return null;
  return value;
}

function sanitizeRecord(
  table: TableName,
  record: Record<string, unknown>,
  options: { partial?: boolean } = {}
) {
  const body = { ...record };

  if (table === 'products') {
    if (!options.partial || 'name' in body) {
      if (!body.name || String(body.name).trim() === '') {
        throw new Error('請填寫商品名稱');
      }
    }
    if (!options.partial || 'merchant_id' in body) {
      const merchantId = emptyToNull(body.merchant_id);
      if (!merchantId || !UUID_RE.test(String(merchantId))) {
        throw new Error('請填寫有效的商家 ID（UUID）');
      }
      body.merchant_id = merchantId;
    }
    if (!options.partial || 'status' in body) {
      body.status = body.status || 'draft';
    }
    if (!options.partial || 'stock' in body) {
      body.stock = body.stock === '' || body.stock === undefined ? 0 : Number(body.stock);
    }
    if (!options.partial || 'price' in body) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('請填寫有效的價格');
      }
      body.price = price;
    }
    if ('category_id' in body) {
      const categoryId = emptyToNull(body.category_id);
      if (categoryId && !UUID_RE.test(String(categoryId))) {
        throw new Error('分類 ID 格式不正確');
      }
      body.category_id = categoryId;
    }
    if (!body.images) {
      body.images = [];
    }
  }

  if (table === 'categories') {
    if (!options.partial || 'name' in body) {
      if (!body.name || String(body.name).trim() === '') {
        throw new Error('請填寫分類名稱');
      }
    }
    if (!options.partial || 'slug' in body) {
      if (!body.slug || String(body.slug).trim() === '') {
        throw new Error('請填寫網址代稱');
      }
    }
  }

  if (table === 'merchants') {
    if (!options.partial || 'name' in body) {
      if (!body.name || String(body.name).trim() === '') {
        throw new Error('請填寫店名');
      }
    }
    if (!options.partial || 'slug' in body) {
      if (!body.slug || String(body.slug).trim() === '') {
        throw new Error('請填寫網址代稱');
      }
    }
    if (!options.partial || 'status' in body) {
      body.status = body.status || 'pending';
    }
  }

  return body;
}

function formatDbError(message: string): string {
  if (message.includes('products_merchant_id_fkey')) {
    return '所選商家不存在，請從下拉選單選擇正確的商家（勿填用戶 ID）';
  }
  if (message.includes('products_category_id_fkey')) {
    return '所選分類不存在，請重新選擇或留空';
  }
  return message;
}

async function assertMerchantExists(merchantId: string) {
  const { data, error } = await db()
    .from('merchants')
    .select('id, name, status')
    .eq('id', merchantId)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) {
    throw new Error('找不到此商家，請先到「商家管理」確認商家已建立並通過審核');
  }
}

async function assertCategoryExists(categoryId: string) {
  const { data, error } = await db()
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();

  if (error) throw new Error(formatDbError(error.message));
  if (!data) {
    throw new Error('找不到此分類，請重新選擇或留空');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() {
  return createAdminClient() as any;
}

export async function getTableData(table: TableName, page = 1, limit = 20) {
  const { data, error } = await db()
    .from(table)
    .select('*')
    .range((page - 1) * limit, page * limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRecord(table: TableName, id: string) {
  const { data, error } = await db().from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createRecord(table: TableName, record: Record<string, unknown>) {
  const payload = sanitizeRecord(table, record);

  if (table === 'products') {
    await assertMerchantExists(String(payload.merchant_id));
    if (payload.category_id) {
      await assertCategoryExists(String(payload.category_id));
    }
  }

  const { data, error } = await db().from(table).insert(payload).select().single();
  if (error) throw new Error(formatDbError(error.message));
  if (!data) throw new Error('建立失敗，未取得資料');
  return data;
}

export async function updateRecord(table: TableName, id: string, record: Record<string, unknown>) {
  const payload = sanitizeRecord(table, record, { partial: true });

  if (table === 'products') {
    if (payload.merchant_id) {
      await assertMerchantExists(String(payload.merchant_id));
    }
    if (payload.category_id) {
      await assertCategoryExists(String(payload.category_id));
    }
  }

  const { data, error } = await db().from(table).update(payload).eq('id', id).select().single();
  if (error) throw new Error(formatDbError(error.message));
  if (!data) throw new Error('更新失敗，未取得資料');
  return data;
}

export async function deleteRecord(table: TableName, id: string) {
  const { error } = await db().from(table).delete().eq('id', id);
  if (error) throw error;
}

export function getTableSchema(table: TableName) {
  const schemas: Record<TableName, string[]> = {
    products: ['id', 'name', 'price', 'stock', 'images', 'merchant_id', 'status'],
    merchants: ['id', 'name', 'slug', 'user_id', 'status', 'contact_name', 'contact_phone', 'applied_at'],
    orders: ['id', 'total', 'status', 'tracking_number', 'user_id', 'merchant_id'],
    categories: ['id', 'name', 'slug'],
  };
  return schemas[table] || [];
}
