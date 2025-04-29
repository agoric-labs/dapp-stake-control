import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { type OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { AmountKeywordRecord } from '@agoric/zoe';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { Fail } from '@endo/errors';
import type { StkCTerms, start as startStake } from '../stake.contract.js';
import * as contractExports from '../stake.contract.js';
import { type PortfolioConfig } from '../typeGuards.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { executeOffer, startContract } from './supports.js';

test('onboarding: create staking portfolio', async (t) => {
  const common = await commonSetup(t);
  const BLD = withAmountUtils(makeIssuerKit('BLD'));
  const customTerms: StkCTerms = harden({
    portfolioFee: BLD.make(20n),
  });
  const startKit = await startContract<typeof startStake>(contractExports, {
    terms: customTerms,
    issuers: { BLD: BLD.issuer },
    privateArgs: common.commonPrivateArgs,
  });
  const { instance, zoe } = startKit;

  const offerArgs: PortfolioConfig = {
    osmosis: { freq: 'daily', onReceipt: ['stake'], onRewards: ['restake'] },
  };

  const give: AmountKeywordRecord = harden({
    Fee: BLD.units(10),
    Retainer: BLD.units(50),
  });

  const publicInvitationMaker = 'makeStakingPortfolio';
  const spec: OfferSpec = {
    id: 'msp-1',
    invitationSpec: { source: 'contract', instance, publicInvitationMaker },
    offerArgs,
    proposal: { give },
  };
  t.log(spec);

  const myBLD = BLD.issuer.makeEmptyPurse();
  myBLD.deposit(BLD.mint.mintPayment(BLD.units(100)));
  /** @param {Brand} b */
  const providePurse = (b) =>
    b === BLD.brand ? myBLD : Fail`no purse for ${b}`;
  const { vowTools } = common.utils;
  const { result, payouts } = await executeOffer(
    zoe,
    vowTools.when,
    spec,
    providePurse,
  );
  if (result === null || typeof result !== 'object') {
    throw t.is(typeof result, 'object');
  }
  t.deepEqual(Object.keys(result), ['invitationMakers']);
  const refund = myBLD.deposit(await payouts.Fee);
  t.log('TODO: contract should consume fee', refund);
  t.deepEqual(refund, give.Fee);
});
