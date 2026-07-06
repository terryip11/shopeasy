/** 商家訂單列表用的配送任務摘要 */
export type MerchantDeliveryJobSummary = {
  id: string;
  order_id: string;
  job_type: string;
  status: string;
  courier_id: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  assigned_at: string | null;
  delivered_at: string | null;
  dropoff_address: string | null;
};
