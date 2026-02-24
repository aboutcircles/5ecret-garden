export type GatewayRow = {
  gateway: string;
  timestamp?: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  tx?: string;
};

export type TrustRow = {
  trustReceiver: string;
  expiry: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
};
