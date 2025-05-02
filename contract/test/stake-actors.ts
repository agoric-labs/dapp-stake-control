import type { PaymentPKeywordRecord, ZoeService } from '@agoric/zoe';
import type { PortfolioConfig, ProposalShapes } from '../typeGuards.js';
import type { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { ExecutionContext } from 'ava';
import type { StartFn } from '../stake.contract.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { Fail } from '@endo/errors';
import { executeOffer } from './supports.js';
import type { Amount, Payment } from '@agoric/ertp';

export interface WalletTool {
  executeOffer(
    spec: OfferSpec,
  ): Promise<{ result: unknown; payouts: PaymentPKeywordRecord }>;
  deposit(p: Payment<'nat'>): Amount<'nat'>;
}

export const makeWallet = (
  asset: ReturnType<typeof withAmountUtils>,
  zoe: ZoeService,
  when,
  initialBalance = 100,
): WalletTool => {
  const purse = asset.issuer.makeEmptyPurse();
  purse.deposit(asset.mint.mintPayment(asset.units(initialBalance)));
  /** @param {Brand} b */
  const providePurse = (b) =>
    b === asset.brand ? purse : Fail`no purse for ${b}`;
  return harden({
    executeOffer(spec) {
      return executeOffer(zoe, when, spec, providePurse);
    },
    deposit(p) {
      return purse.deposit(p);
    },
  });
};

export const makeCustomer = (
  wallet: WalletTool,
  instance: Instance<StartFn>,
  // XXX could get from terms
  BLD: Pick<ReturnType<typeof withAmountUtils>, 'brand' | 'issuer' | 'units'>,
) => {
  let nonce = 0;
  return harden({
    async makePortfolio(t: ExecutionContext) {
      const config: PortfolioConfig = {
        osmosis: {
          freq: 'daily',
          onReceipt: ['stake'],
          onRewards: ['restake'],
        },
      };

      const proposal: ProposalShapes['makePortfolio'] = harden({
        give: {
          // XXX should get from terms
          Fee: BLD.units(10),
          Retainer: BLD.units(50),
        },
      });

      const publicInvitationMaker = 'makeStakingPortfolio';
      const spec: OfferSpec = {
        id: `makeSP-${(nonce += 1)}`,
        invitationSpec: { source: 'contract', instance, publicInvitationMaker },
        offerArgs: config,
        proposal,
      };
      t.log(spec);

      const offered = await wallet.executeOffer(spec);
      return harden({ spec, ...offered });
    },
  });
};
