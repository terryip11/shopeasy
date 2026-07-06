/** 配送追蹤相關節流設定（client + server 共用常數） */

/** 配送員客戶端 GPS 輪詢間隔 */
export const COURIER_GPS_INTERVAL_MS = 90_000;

/** 配送員移動少於此距離（米）則不上報 */
export const COURIER_GPS_MIN_MOVE_METERS = 75;

/** 伺服器端：最短兩次寫入間隔 */
export const SERVER_LOCATION_MIN_INTERVAL_MS = 60_000;

/** 伺服器端：移動少於此距離（米）則跳過寫入 */
export const SERVER_LOCATION_MIN_MOVE_METERS = 50;

/** 商家訂單徽章：Realtime 備用輪詢（僅防連線中斷） */
export const MERCHANT_STATS_FALLBACK_POLL_MS = 300_000;
