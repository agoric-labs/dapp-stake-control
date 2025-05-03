import { makeAgoricWalletConnection } from '@agoric/web-components';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';

// XXX cross-package import
// @ts-ignore
import type { PortfolioConfig } from '../../../contract/typeGuards.js';
import { networkConfigs } from '../config.js';
import { makeAgoricChainStorageWatcher } from '@agoric/rpc';

export type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export interface AppState {
  wallet: Wallet | null;
  contractInstance?: unknown;
  brands?: Record<string, unknown> | null;
  loading: boolean;
  error?: string;
  tab: number;
  currentOffers: CurrentWalletRecord | null;
  network: keyof typeof networkConfigs;
  isNetworkChanging: boolean;
  watcher: ReturnType<typeof makeAgoricChainStorageWatcher> | null;
}

export type OfferArgsPortfolio = PortfolioConfig;

export type ToastMessageOptions = {
  content: string;
  duration?: number;
};

export type FrequencyValues = 'daily' | 'weekly';
