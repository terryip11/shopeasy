import { redirect } from 'next/navigation';

/** 舊「配送員平台抽成」入口：訂閱為主後已移除該設定 UI */
export default function AdminCourierPlatformFeePage() {
  redirect('/admin/couriers');
}
