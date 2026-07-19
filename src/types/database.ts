/**
 * Supabase 資料庫類型
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = 'buyer' | 'merchant' | 'admin' | 'super_admin' | 'accountant' | 'promoter';
export type UserCapability = 'food_courier' | 'parcel_courier';
export type DeliveryJobType = 'food' | 'parcel';
export type DeliveryJobStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'failed'
  | 'cancelled';
export type CourierProfileStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded' | 'refund_requested';
export type MerchantStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type MerchantTier = 'basic' | 'premium' | 'vip';
export type MerchantBusinessType = 'food' | 'retail';
export type TierUpgradeStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
        };
        Update: {
          role?: UserRole;
          display_name?: string | null;
        };
      };
      buyer_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          name: string;
          phone: string;
          address: string;
          zone_id: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          name: string;
          phone: string;
          address: string;
          zone_id?: string | null;
          is_default?: boolean;
        };
        Update: {
          label?: string | null;
          name?: string;
          phone?: string;
          address?: string;
          zone_id?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      merchants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          user_id: string;
          status: MerchantStatus;
          applied_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reject_reason: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          company_address: string | null;
          default_pickup_address: string | null;
          default_pickup_contact_name: string | null;
          default_pickup_contact_phone: string | null;
          br_image_url: string | null;
          ci_image_url: string | null;
          data_consent_at: string | null;
          logo_url: string | null;
          store_tagline: string | null;
          store_description: string | null;
          banner_url: string | null;
          theme_color: string | null;
          payment_methods: string[];
          payout_bank_name: string | null;
          payout_account_holder: string | null;
          payout_account_number: string | null;
          payout_fps_id: string | null;
          payout_wechat_id: string | null;
          payout_wechat_qr_url: string | null;
          payout_alipay_id: string | null;
          payout_alipay_qr_url: string | null;
          courier_fee_food: number;
          courier_fee_parcel: number;
          checkout_shipping_fee: number;
          business_type: MerchantBusinessType;
          tier: MerchantTier;
          stripe_subscription_id: string | null;
          tier_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          user_id: string;
          status?: MerchantStatus;
          tier?: MerchantTier;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          company_address?: string | null;
          default_pickup_address?: string | null;
          default_pickup_contact_name?: string | null;
          default_pickup_contact_phone?: string | null;
          br_image_url?: string | null;
          ci_image_url?: string | null;
          data_consent_at?: string | null;
          logo_url?: string | null;
          store_tagline?: string | null;
          store_description?: string | null;
          banner_url?: string | null;
          theme_color?: string | null;
          payment_methods?: string[];
          business_type?: MerchantBusinessType;
          stripe_subscription_id?: string | null;
          tier_period_end?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          status?: MerchantStatus;
          tier?: MerchantTier;
          stripe_subscription_id?: string | null;
          tier_period_end?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reject_reason?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          company_address?: string | null;
          default_pickup_address?: string | null;
          default_pickup_contact_name?: string | null;
          default_pickup_contact_phone?: string | null;
          br_image_url?: string | null;
          ci_image_url?: string | null;
          data_consent_at?: string | null;
          logo_url?: string | null;
          store_tagline?: string | null;
          store_description?: string | null;
          banner_url?: string | null;
          theme_color?: string | null;
          payment_methods?: string[];
          payout_bank_name?: string | null;
          payout_account_holder?: string | null;
          payout_account_number?: string | null;
          payout_fps_id?: string | null;
          payout_wechat_id?: string | null;
          payout_wechat_qr_url?: string | null;
          payout_alipay_id?: string | null;
          payout_alipay_qr_url?: string | null;
          courier_fee_food?: number;
          courier_fee_parcel?: number;
          checkout_shipping_fee?: number;
          business_type?: MerchantBusinessType;
        };
      };
      courier_ratings: {
        Row: {
          id: string;
          order_id: string;
          buyer_id: string;
          courier_id: string;
          score: number;
          created_at: string;
        };
        Insert: {
          order_id: string;
          buyer_id: string;
          courier_id: string;
          score: number;
        };
        Update: {
          score?: number;
        };
      };
      courier_buyer_rating_surcharges: {
        Row: {
          id: string;
          rating_below: number;
          surcharge_hkd: number;
          label: string | null;
          sort_order: number;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          rating_below: number;
          surcharge_hkd: number;
          label?: string | null;
          sort_order?: number;
          enabled?: boolean;
        };
        Update: {
          rating_below?: number;
          surcharge_hkd?: number;
          label?: string | null;
          sort_order?: number;
          enabled?: boolean;
        };
      };
      merchant_subscription_payments: {
        Row: {
          id: string;
          merchant_id: string;
          user_id: string;
          tier: 'premium' | 'vip';
          amount_hkd: number;
          currency: string;
          stripe_checkout_session_id: string | null;
          stripe_subscription_id: string | null;
          stripe_invoice_id: string | null;
          payment_type: 'initial' | 'renewal';
          status: 'completed' | 'refunded';
          paid_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          user_id: string;
          tier: 'premium' | 'vip';
          amount_hkd: number;
          currency?: string;
          stripe_checkout_session_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_invoice_id?: string | null;
          payment_type?: 'initial' | 'renewal';
          status?: 'completed' | 'refunded';
          paid_at?: string;
        };
        Update: {
          status?: 'completed' | 'refunded';
        };
      };
      merchant_tier_upgrades: {
        Row: {
          id: string;
          merchant_id: string;
          user_id: string;
          current_tier: MerchantTier;
          requested_tier: MerchantTier;
          status: TierUpgradeStatus;
          note: string | null;
          reject_reason: string | null;
          applied_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          user_id: string;
          current_tier: MerchantTier;
          requested_tier: MerchantTier;
          status?: TierUpgradeStatus;
          note?: string | null;
        };
        Update: {
          status?: TierUpgradeStatus;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          images: string[];
          merchant_id: string;
          category_id: string | null;
          status: ProductStatus;
          stock: number;
          checkout_shipping_fee: number;
          courier_fee: number | null;
          pickup_location_id: string | null;
          product_kind: string;
          menu_category_id: string | null;
          attributes: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          images?: string[];
          merchant_id: string;
          category_id?: string | null;
          status?: ProductStatus;
          stock?: number;
          checkout_shipping_fee?: number;
          courier_fee?: number | null;
          pickup_location_id?: string | null;
          product_kind?: string;
          menu_category_id?: string | null;
          attributes?: Json;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          images?: string[];
          merchant_id?: string;
          category_id?: string | null;
          status?: ProductStatus;
          stock?: number;
          checkout_shipping_fee?: number;
          courier_fee?: number | null;
          pickup_location_id?: string | null;
          product_kind?: string;
          menu_category_id?: string | null;
          attributes?: Json;
        };
      };
      merchant_menu_categories: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          merchant_id?: string;
          name?: string;
          sort_order?: number;
        };
      };
      merchant_pickup_locations: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          address: string;
          contact_name: string | null;
          contact_phone: string | null;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          address: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          is_default?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string | null;
          size: string | null;
          color: string | null;
          price: number | null;
          stock: number;
          sort_order: number;
          options: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          sku?: string | null;
          size?: string | null;
          color?: string | null;
          price?: number | null;
          stock?: number;
          sort_order?: number;
          options?: Json;
        };
        Update: {
          product_id?: string;
          sku?: string | null;
          size?: string | null;
          color?: string | null;
          price?: number | null;
          stock?: number;
          sort_order?: number;
          options?: Json;
        };
      };
      product_option_groups: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          min_select: number;
          max_select: number;
          required: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          min_select?: number;
          max_select?: number;
          required?: boolean;
          sort_order?: number;
        };
        Update: {
          product_id?: string;
          name?: string;
          min_select?: number;
          max_select?: number;
          required?: boolean;
          sort_order?: number;
        };
      };
      product_options: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          price_delta: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          price_delta?: number;
          sort_order?: number;
        };
        Update: {
          group_id?: string;
          name?: string;
          price_delta?: number;
          sort_order?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          merchant_id: string | null;
          items: Json;
          status: OrderStatus;
          total: number;
          subtotal: number | null;
          shipping_fee: number;
          stripe_payment_id: string | null;
          payment_method: string | null;
          tracking_number: string | null;
          shipping_name: string | null;
          shipping_phone: string | null;
          shipping_address: string | null;
          shipping_zone_id: string | null;
          buyer_payment_claimed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant_id?: string | null;
          items?: Json;
          status?: OrderStatus;
          total: number;
          subtotal?: number | null;
          shipping_fee?: number;
          stripe_payment_id?: string | null;
          payment_method?: string | null;
          tracking_number?: string | null;
          shipping_name?: string | null;
          shipping_phone?: string | null;
          shipping_address?: string | null;
          shipping_zone_id?: string | null;
          buyer_payment_claimed_at?: string | null;
        };
        Update: {
          status?: OrderStatus;
          subtotal?: number | null;
          shipping_fee?: number;
          stripe_payment_id?: string | null;
          buyer_payment_claimed_at?: string | null;
          payment_method?: string | null;
          tracking_number?: string | null;
          shipping_name?: string | null;
          shipping_phone?: string | null;
          shipping_address?: string | null;
          shipping_zone_id?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          name?: string;
          slug?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          admin_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
        };
        Update: Record<string, never>;
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          slug: string;
          region: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          region?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          region?: string | null;
        };
      };
      user_capabilities: {
        Row: {
          user_id: string;
          capability: UserCapability;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          user_id: string;
          capability: UserCapability;
          granted_by?: string | null;
        };
        Update: Record<string, never>;
      };
      courier_profiles: {
        Row: {
          user_id: string;
          phone: string | null;
          vehicle_type: 'walk' | 'bicycle' | 'motorcycle' | 'van' | null;
          preferred_job_type: 'food' | 'parcel' | 'both' | null;
          zone_ids: string[];
          is_online: boolean;
          status: CourierProfileStatus;
          applied_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reject_reason: string | null;
          hkid_image_url: string | null;
          declaration_accepted_at: string | null;
          customer_rating_avg: number | null;
          customer_rating_count: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          phone?: string | null;
          vehicle_type?: 'walk' | 'bicycle' | 'motorcycle' | 'van' | null;
          preferred_job_type?: 'food' | 'parcel' | 'both' | null;
          zone_ids?: string[];
          is_online?: boolean;
          status?: CourierProfileStatus;
          hkid_image_url?: string | null;
          declaration_accepted_at?: string | null;
          customer_rating_avg?: number | null;
          customer_rating_count?: number;
        };
        Update: {
          phone?: string | null;
          vehicle_type?: 'walk' | 'bicycle' | 'motorcycle' | 'van' | null;
          preferred_job_type?: 'food' | 'parcel' | 'both' | null;
          zone_ids?: string[];
          is_online?: boolean;
          status?: CourierProfileStatus;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reject_reason?: string | null;
          hkid_image_url?: string | null;
          declaration_accepted_at?: string | null;
          customer_rating_avg?: number | null;
          customer_rating_count?: number;
        };
      };
      delivery_jobs: {
        Row: {
          id: string;
          order_id: string;
          job_type: DeliveryJobType;
          zone_id: string | null;
          status: DeliveryJobStatus;
          courier_id: string | null;
          pickup_address: string | null;
          pickup_code: string;
          pickup_contact_name: string | null;
          pickup_contact_phone: string | null;
          pickup_location_id: string | null;
          dropoff_address: string | null;
          dropoff_lat: number | null;
          dropoff_lng: number | null;
          pickup_lat: number | null;
          pickup_lng: number | null;
          courier_lat: number | null;
          courier_lng: number | null;
          courier_location_at: string | null;
          notes: string | null;
          version: number;
          assigned_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          courier_fee_base: number | null;
          courier_fee_surcharge: number;
          courier_fee_total: number | null;
          courier_payout_net: number | null;
          platform_fee_rate: number | null;
          platform_fee_amount: number;
          payout_snapshot_version: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          job_type: DeliveryJobType;
          zone_id?: string | null;
          status?: DeliveryJobStatus;
          pickup_address?: string | null;
          pickup_code?: string;
          pickup_contact_name?: string | null;
          pickup_contact_phone?: string | null;
          pickup_location_id?: string | null;
          dropoff_address?: string | null;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          courier_lat?: number | null;
          courier_lng?: number | null;
          courier_location_at?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: DeliveryJobStatus;
          courier_id?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          courier_lat?: number | null;
          courier_lng?: number | null;
          courier_location_at?: string | null;
          courier_fee_base?: number | null;
          courier_fee_surcharge?: number;
          courier_fee_total?: number | null;
          courier_payout_net?: number | null;
          platform_fee_rate?: number | null;
          platform_fee_amount?: number;
          payout_snapshot_version?: number | null;
          version?: number;
        };
      };
      order_ledger: {
        Row: {
          id: string;
          order_id: string;
          merchant_id: string;
          gmv: number;
          payment_method: string;
          currency: string;
          stripe_fee: number;
          platform_fee_rate: number;
          platform_fee_amount: number;
          infra_cost_allocated: number;
          delivery_cost: number;
          merchant_net: number;
          platform_net: number;
          settlement_status: 'recorded' | 'settled' | 'reversed';
          paid_at: string;
          created_at: string;
        };
        Insert: {
          order_id: string;
          merchant_id: string;
          gmv: number;
          payment_method?: string;
          currency?: string;
          stripe_fee?: number;
          platform_fee_rate: number;
          platform_fee_amount: number;
          infra_cost_allocated?: number;
          delivery_cost?: number;
          merchant_net: number;
          platform_net: number;
          settlement_status?: 'recorded' | 'settled' | 'reversed';
          paid_at?: string;
        };
        Update: {
          settlement_status?: 'recorded' | 'settled' | 'reversed';
        };
      };
      platform_monthly_costs: {
        Row: {
          id: string;
          month: string;
          supabase_cost: number;
          r2_cost: number;
          stripe_fees_reported: number;
          other_cost: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          month: string;
          supabase_cost?: number;
          r2_cost?: number;
          stripe_fees_reported?: number;
          other_cost?: number;
          notes?: string | null;
        };
        Update: {
          supabase_cost?: number;
          r2_cost?: number;
          stripe_fees_reported?: number;
          other_cost?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      qr_login_polls: {
        Row: {
          id: string;
          email: string;
          user_id: string | null;
          status: 'pending' | 'confirmed' | 'consumed' | 'expired';
          expires_at: string;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          status?: 'pending' | 'confirmed' | 'consumed' | 'expired';
          expires_at: string;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          user_id?: string | null;
          status?: 'pending' | 'confirmed' | 'consumed' | 'expired';
          expires_at?: string;
          confirmed_at?: string | null;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          updated_at?: string;
        };
      };
    };
    Functions: {
      claim_delivery_job: {
        Args: { p_job_id: string };
        Returns: Database['public']['Tables']['delivery_jobs']['Row'];
      };
      has_capability: {
        Args: { p_capability: string };
        Returns: boolean;
      };
      is_active_courier: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
