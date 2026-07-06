import type { TableName } from './tables';

export type FieldType = 'text' | 'number' | 'select' | 'readonly' | 'merchantPick' | 'categoryPick';

export type TableField = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
};

export const TABLE_FIELDS: Record<TableName, TableField[]> = {
  categories: [
    { key: 'name', label: '名稱', type: 'text', required: true },
    { key: 'slug', label: '網址代稱', type: 'text', required: true },
  ],
  products: [
    { key: 'name', label: '商品名稱', type: 'text', required: true },
    { key: 'price', label: '價格', type: 'number', required: true },
    { key: 'stock', label: '庫存', type: 'number', required: true },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      options: [
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '上架' },
        { value: 'archived', label: '封存' },
      ],
    },
    { key: 'merchant_id', label: '所屬商家', type: 'merchantPick', required: true },
    { key: 'category_id', label: '分類（選填）', type: 'categoryPick' },
  ],
  merchants: [
    { key: 'name', label: '店名', type: 'text', required: true },
    { key: 'slug', label: '網址代稱', type: 'text', required: true },
    {
      key: 'status',
      label: '狀態',
      type: 'select',
      options: [
        { value: 'pending', label: '待審核' },
        { value: 'active', label: '營運中' },
        { value: 'rejected', label: '已拒絕' },
        { value: 'suspended', label: '已停用' },
      ],
    },
    { key: 'user_id', label: '用戶 ID', type: 'readonly' },
  ],
  orders: [
  {
      key: 'status',
      label: '狀態',
      type: 'select',
      options: [
        { value: 'pending', label: '待付款' },
        { value: 'paid', label: '已付款' },
        { value: 'shipped', label: '已發貨' },
        { value: 'refund_requested', label: '退款申請中' },
        { value: 'cancelled', label: '已取消' },
        { value: 'refunded', label: '已退款' },
      ],
    },
    { key: 'tracking_number', label: '物流追蹤號', type: 'text' },
    { key: 'total', label: '金額', type: 'readonly' },
    { key: 'user_id', label: '買家 ID', type: 'readonly' },
    { key: 'merchant_id', label: '商家 ID', type: 'readonly' },
  ],
};
