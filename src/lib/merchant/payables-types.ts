export type PayablePromoterItem = {
  id: string;
  orderId: string;
  orderShort: string;
  amount: number;
  commissionRate: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  paidNote: string | null;
  promoter: {
    id: string;
    displayName: string;
    accountHolder: string;
    fpsId: string;
  };
};

export type PayableCourierItem = {
  id: string;
  orderId: string;
  orderShort: string;
  deliveryJobId: string;
  amount: number;
  grossAmount: number | null;
  jobType: string;
  earnedAt: string;
  settlementStatus: string;
  paidAt: string | null;
  paidNote: string | null;
  courier: {
    id: string;
    displayName: string;
    phone: string | null;
    accountHolder: string;
    fpsId: string;
  };
};

export type MerchantPayablesSummary = {
  promoterPendingTotal: number;
  promoterPendingCount: number;
  courierPendingTotal: number;
  courierPendingCount: number;
  promoters: PayablePromoterItem[];
  couriers: PayableCourierItem[];
};
