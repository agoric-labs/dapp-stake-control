import { makeAgoricWalletConnection } from '@agoric/web-components';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';

// XXX cross-package import
import type { PortfolioConfig } from '../../../contract/typeGuards.js';

export type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export interface BalanceCheckParams {
  walletAddress: string;
  rpcUrl: string;
  tokenDenom: string;
}

export interface AppState {
  wallet?: Wallet;
  contractInstance?: unknown;
  brands?: Record<string, unknown>;
  loading: boolean;
  error?: string;
  tab: number;
  currentOffers: CurrentWalletRecord | null;
  latestInvitation: string;
}

export type OfferArgsPortfolio = PortfolioConfig;
