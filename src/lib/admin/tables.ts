export type TableName = 'products' | 'merchants' | 'orders' | 'categories';

const VALID_TABLES: TableName[] = ['products', 'merchants', 'orders', 'categories'];

export function isValidTable(table: string): table is TableName {
  return VALID_TABLES.includes(table as TableName);
}

export const ADMIN_TABLE_LABELS: Record<TableName, string> = {
  categories: '分類',
  products: '商品',
  merchants: '商家',
  orders: '訂單',
};
