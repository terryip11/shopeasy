import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveMerchantForUser } from '@/lib/auth/server';
import { pickPrimaryDeliveryJob } from '@/lib/delivery/pick-primary-job';
import { repairDropoffCoordinates } from '@/lib/delivery/geo';
import type { MerchantOrderTracking } from '@/lib/merchant/delivery-tracking-types';
import type { Database } from '@/types/database';

export type { MerchantOrderTracking } from '@/lib/merchant/delivery-tracking-types';

export async function getMerchantOrderTracking(orderId: string): Promise<MerchantOrderTracking | null> {
  const merchant = await getActiveMerchantForUser();
  if (!merchant) return null;

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, total, shipping_name, shipping_phone, shipping_address, shipping_zone_id, tracking_number, created_at, merchant_id')
    .eq('id', orderId)
    .eq('merchant_id', merchant.id)
    .single();

  if (!order) return null;

  const orderRow = order as Database['public']['Tables']['orders']['Row'] & {
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    shipping_zone_id: string | null;
    tracking_number: string | null;
  };

  const { data: jobs } = await supabase
    .from('delivery_jobs')
    .select('*, delivery_zones (name, slug)')
    .eq('order_id', orderId)
    .in('status', ['pending', 'assigned', 'picked_up', 'delivered']);

  const jobRow = (pickPrimaryDeliveryJob(
    (jobs || []) as (Database['public']['Tables']['delivery_jobs']['Row'] & {
      delivery_zones: { name: string; slug: string } | null;
    })[]
  ) ?? null) as
    | (Database['public']['Tables']['delivery_jobs']['Row'] & {
        delivery_zones: { name: string; slug: string } | null;
      })
    | null;

  let courier: { display_name: string | null; phone: string | null } | null = null;

  if (jobRow?.courier_id) {
    const admin = createAdminClient();
    const [{ data: profile }, { data: courierProfile }] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', jobRow.courier_id).maybeSingle(),
      admin.from('courier_profiles').select('phone').eq('user_id', jobRow.courier_id).maybeSingle(),
    ]);

    courier = {
      display_name: (profile as { display_name: string | null } | null)?.display_name ?? null,
      phone: (courierProfile as { phone: string | null } | null)?.phone ?? null,
    };
  }

  let dropoffLat = jobRow?.dropoff_lat != null ? Number(jobRow.dropoff_lat) : null;
  let dropoffLng = jobRow?.dropoff_lng != null ? Number(jobRow.dropoff_lng) : null;
  let dropoffMapLabel: string | null = null;

  if (jobRow) {
    const repaired = await repairDropoffCoordinates({
      dropoffAddress: jobRow.dropoff_address,
      dropoffLat,
      dropoffLng,
      zoneSlug: jobRow.delivery_zones?.slug ?? null,
      zoneName: jobRow.delivery_zones?.name ?? null,
    });

    if (repaired) {
      const changed =
        dropoffLat !== repaired.lat ||
        dropoffLng !== repaired.lng ||
        dropoffLat == null ||
        dropoffLng == null;

      dropoffLat = repaired.lat;
      dropoffLng = repaired.lng;
      if (repaired.source === 'district' && repaired.label) {
        dropoffMapLabel = `${repaired.label}（配送區域中心，詳細地址見上方）`;
      }

      if (changed && jobRow.id) {
        const admin = createAdminClient();
        void (admin as any)
          .from('delivery_jobs')
          .update({ dropoff_lat: repaired.lat, dropoff_lng: repaired.lng })
          .eq('id', jobRow.id);
      }
    }
  }

  return {
    order: {
      id: orderRow.id,
      status: orderRow.status,
      total: Number(orderRow.total),
      shipping_name: orderRow.shipping_name,
      shipping_phone: orderRow.shipping_phone,
      shipping_address: orderRow.shipping_address,
      tracking_number: orderRow.tracking_number,
      created_at: orderRow.created_at,
    },
    job: jobRow
      ? {
          id: jobRow.id,
          job_type: jobRow.job_type,
          status: jobRow.status,
          pickup_address: jobRow.pickup_address,
          pickup_code: jobRow.pickup_code ?? '',
          pickup_contact_name: jobRow.pickup_contact_name ?? null,
          pickup_contact_phone: jobRow.pickup_contact_phone ?? null,
          dropoff_address: jobRow.dropoff_address,
          dropoff_lat: dropoffLat,
          dropoff_lng: dropoffLng,
          courier_lat: jobRow.courier_lat != null ? Number(jobRow.courier_lat) : null,
          courier_lng: jobRow.courier_lng != null ? Number(jobRow.courier_lng) : null,
          courier_location_at: jobRow.courier_location_at,
          assigned_at: jobRow.assigned_at,
          picked_up_at: jobRow.picked_up_at,
          delivered_at: jobRow.delivered_at,
          zone_name: jobRow.delivery_zones?.name ?? null,
          dropoff_map_label: dropoffMapLabel,
          courier,
        }
      : null,
  };
}
