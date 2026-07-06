import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth/server';
import {
  REGULAR_ADMIN_PERMISSIONS,
  ACCOUNTANT_PERMISSIONS,
  isSuperAdmin,
  isAccountant,
  isAdminRole,
} from '@/lib/auth/permissions';

export async function GET() {
  const role = await getUserRole();
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  let permissions: string[];
  if (isSuperAdmin(role)) {
    permissions = ['*'];
  } else if (isAccountant(role)) {
    permissions = ACCOUNTANT_PERMISSIONS;
  } else {
    permissions = REGULAR_ADMIN_PERMISSIONS;
  }

  return NextResponse.json({
    role,
    isSuperAdmin: isSuperAdmin(role),
    isAccountant: isAccountant(role),
    permissions,
  });
}
