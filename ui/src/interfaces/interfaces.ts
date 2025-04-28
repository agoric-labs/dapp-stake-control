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
      }
    ]
  >;
  purses: Array<unknown>;
}

export interface BalanceCheckParams {
  walletAddress: string;
  rpcUrl: string;
  tokenDenom: string;
}
