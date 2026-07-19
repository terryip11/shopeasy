export type MerchantOrderTracking = {
  order: {
    id: string;
    status: string;
    total: number;
    shipping_name: string | null;
    shipping_phone: string | null;
    shipping_address: string | null;
    tracking_number: string | null;
    created_at: string;
  };
  job: {
    id: string;
    job_type: string;
    status: string;
    pickup_address: string | null;
    pickup_code: string;
    pickup_contact_name: string | null;
    pickup_contact_phone: string | null;
    dropoff_address: string | null;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    courier_lat: number | null;
    courier_lng: number | null;
    courier_location_at: string | null;
    assigned_at: string | null;
    picked_up_at: string | null;
    delivered_at: string | null;
    zone_name: string | null;
    dropoff_map_label?: string | null;
    courier: {
      display_name: string | null;
      phone: string | null;
    } | null;
  } | null;
};
