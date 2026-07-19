export const PLATFORM_PAYOUT_HOLDER_KEY = 'platform_payout_account_holder';
export const PLATFORM_PAYOUT_FPS_ID_KEY = 'platform_payout_fps_id';
export const PLATFORM_PAYOUT_INSTRUCTIONS_KEY = 'platform_payout_instructions';

export type PlatformPayoutSettings = {
  accountHolder: string;
  fpsId: string;
  instructions: string;
};
