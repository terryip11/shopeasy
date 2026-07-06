import { NextResponse } from 'next/server';
import {
  getAvailableJobsForCourier,
  getCourierActiveJobs,
} from '@/lib/courier/server';

export async function GET() {
  const [availableResult, mine] = await Promise.all([
    getAvailableJobsForCourier(),
    getCourierActiveJobs(),
  ]);

  return NextResponse.json({
    available: availableResult.jobs,
    outsideZoneCount: availableResult.outsideZoneCount,
    zoneNames: availableResult.zoneNames,
    mine,
  });
}
