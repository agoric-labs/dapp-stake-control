import { makeAgoricWalletConnection } from '@agoric/web-components';

export type Wallet = Awaited<ReturnType<typeof makeAgoricWalletConnection>>;

export interface CurrentOffer {
  liveOffers: Array<unknown>;
  offerToPublicSubscriberPaths: Array<unknown>;
  offerToUsedInvitation: Array<
    [
      string,
      {
        brand: unknown;
        value: Array<{
          description: string;
          handle: unknown;
          instance: unknown;
          installation: unknown;
        }>;
      },
    ]
  >;
  purses: Array<unknown>;
}

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
  currentOffers: CurrentOffer | null;
  latestInvitation: string;
}
