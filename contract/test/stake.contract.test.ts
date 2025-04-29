import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { type OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeCopySet } from '@endo/patterns';
import type { StakingTerms, start as startStake } from '../stake.contract.js';
import * as contractExports from '../stake.contract.js';
import { type PortfolioConfig } from '../typeGuards.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { executeOffer, startContract } from './supports.js';
import { type AmountKeywordRecord } from '@agoric/zoe';
import { Fail } from '@endo/errors';

test('onboarding: create staking portfolio', async (t) => {
  const common = await commonSetup(t);
  const BLD = withAmountUtils(makeIssuerKit('BLD'));
  const customTerms: StakingTerms = harden({
    portfolioFee: BLD.make(20n),
  });
  const startKit = await startContract<typeof startStake>(contractExports, {
    terms: customTerms,
    privateArgs: common.commonPrivateArgs,
    issuers: { BLD: BLD.issuer },
  });
  const { instance, zoe } = startKit;

  const config: PortfolioConfig = harden({
    osmosis: {
      freq: 'daily',
      onReceipt: makeCopySet(['stake']),
      onRewards: makeCopySet(['restake']),
    },
  });
  const give: AmountKeywordRecord = harden({
    Fee: BLD.make(20n),
  });
  const spec: OfferSpec = {
    id: 'msp-1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeStakingPortfolio',
      invitationArgs: [config],
    },
    proposal: { give },
  };
  t.log(spec);

  const myBLD = BLD.issuer.makeEmptyPurse();
  myBLD.deposit(BLD.mint.mintPayment(BLD.make(100n)));
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
