import { CourierTypeDashboard } from '@/components/courier/courier-type-dashboard';

export const dynamic = 'force-dynamic';

export default function ParcelCourierPage() {
  return <CourierTypeDashboard jobType="parcel" />;
}
