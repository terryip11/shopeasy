import 'server-only';

/**
 * 商家審批與 Admin 審計
 */

import { createAdminClient } from '@/lib/supabase/admin';

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  const supabase = createAdminClient();
  await (supabase as any).from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}

export async function approveMerchant(merchantId: string, adminId: string) {
  const supabase = createAdminClient();

  const { data: merchant, error: fetchError } = await supabase
    .from('merchants')
    .select('user_id, status')
    .eq('id', merchantId)
    .single();

  if (fetchError || !merchant) throw new Error('商家不存在');
  if ((merchant as { status: string }).status !== 'pending') {
    throw new Error('僅待審核申請可通過');
  }

  const userId = (merchant as { user_id: string }).user_id;

  await (supabase as any)
    .from('merchants')
    .update({
      status: 'active',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      reject_reason: null,
    })
    .eq('id', merchantId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if ((profile as { role: string } | null)?.role === 'buyer') {
    await (supabase as any)
      .from('profiles')
      .update({ role: 'merchant' })
      .eq('id', userId);
  }

  await logAdminAction(adminId, 'merchant.approve', 'merchants', merchantId);
}

export async function rejectMerchant(
  merchantId: string,
  adminId: string,
  reason?: string
) {
  const supabase = createAdminClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('status')
    .eq('id', merchantId)
    .single();

  if (!merchant) throw new Error('商家不存在');
  if ((merchant as { status: string }).status !== 'pending') {
    throw new Error('僅待審核申請可拒絕');
  }

  await (supabase as any)
    .from('merchants')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      reject_reason: reason || null,
    })
    .eq('id', merchantId);

  await logAdminAction(adminId, 'merchant.reject', 'merchants', merchantId, { reason });
}

export async function suspendMerchant(merchantId: string, adminId: string) {
  const supabase = createAdminClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('user_id, status')
    .eq('id', merchantId)
    .single();

  if (!merchant) throw new Error('商家不存在');

  const userId = (merchant as { user_id: string }).user_id;

  await (supabase as any)
    .from('merchants')
    .update({
      status: 'suspended',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', merchantId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const role = (profile as { role: string } | null)?.role;
  if (role === 'merchant') {
    await (supabase as any)
      .from('profiles')
      .update({ role: 'buyer' })
      .eq('id', userId);
  }

  await logAdminAction(adminId, 'merchant.suspend', 'merchants', merchantId);
}

export async function getPendingMerchants() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('status', 'pending')
    .order('applied_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAuditLogs(limit = 50) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
