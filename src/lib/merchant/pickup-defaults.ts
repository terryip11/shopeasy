/** 商家預設取件／發貨地點 */

export type MerchantPickupDefaultsSource = {
  default_pickup_address?: string | null;
  default_pickup_contact_name?: string | null;
  default_pickup_contact_phone?: string | null;
  company_address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
};

export type MerchantPickupDefaults = {
  address: string;
  contactName: string;
  contactPhone: string;
};

export function resolveMerchantPickupDefaults(
  merchant: MerchantPickupDefaultsSource | null | undefined
): MerchantPickupDefaults {
  if (!merchant) {
    return { address: '', contactName: '', contactPhone: '' };
  }

  return {
    address:
      merchant.default_pickup_address?.trim() ||
      merchant.company_address?.trim() ||
      '',
    contactName:
      merchant.default_pickup_contact_name?.trim() ||
      merchant.contact_name?.trim() ||
      '',
    contactPhone:
      merchant.default_pickup_contact_phone?.trim() ||
      merchant.contact_phone?.trim() ||
      '',
  };
}
