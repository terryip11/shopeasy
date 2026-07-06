import 'server-only';

/**
 * 開發用 API 僅允許在 development 環境使用。
 * production 一律拒絕，即使設了 ALLOW_DEV_* 環境變數。
 */
export function isDevOnlyRouteAllowed(flagEnvName: 'ALLOW_DEV_MARK_PAID' | 'ALLOW_DEV_TIER_ACTIVATE') {
  if (process.env.NODE_ENV === 'production') return false;
  return (
    process.env.NODE_ENV === 'development' || process.env[flagEnvName] === 'true'
  );
}
