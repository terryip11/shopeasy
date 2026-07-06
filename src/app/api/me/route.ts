import { NextResponse } from 'next/server';
import { getAuthUser, getProfile } from '@/lib/auth/server';
import { getUserCapabilities, getCourierProfile } from '@/lib/courier/server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ user: null, role: null, capabilities: [], courier: null });
  }

  const [profile, capabilities, courier] = await Promise.all([
    getProfile(),
    getUserCapabilities(user.id),
    getCourierProfile(user.id),
  ]);

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    role: profile?.role ?? 'buyer',
    displayName: profile?.display_name ?? null,
    capabilities,
    courier: courier
      ? {
          status: courier.status,
          is_online: courier.is_online,
          preferred_job_type: courier.preferred_job_type,
        }
      : null,
  });
}
