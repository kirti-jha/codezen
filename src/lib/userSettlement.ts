// User Settlement utilities & BroadcastChannel sync across tabs

export const SETTLEMENT_UPDATED_EVENT = "userSettlementUpdated";
const SETTLEMENT_BROADCAST_CHANNEL = "genpay_user_settlement_channel";

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel(SETTLEMENT_BROADCAST_CHANNEL);
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === SETTLEMENT_UPDATED_EVENT) {
      window.dispatchEvent(new CustomEvent(SETTLEMENT_UPDATED_EVENT, { detail: event.data.detail }));
    }
  };
}

export function notifyUserSettlementUpdated(detail?: any) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SETTLEMENT_UPDATED_EVENT, { detail }));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: SETTLEMENT_UPDATED_EVENT, detail });
    }
  }
}

export function calculateUsableMainWalletBalance(mainBalance: number, activeHoldAmount: number): number {
  return Math.max(0, mainBalance - activeHoldAmount);
}

export function getT1WalletBalance(walletData: { t1Balance?: number }): number {
  return Number(walletData?.t1Balance ?? 0);
}
