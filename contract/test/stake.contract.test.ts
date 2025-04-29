import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { type OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import { makeCopySet } from '@endo/patterns';
import type { start as startStake } from '../stake.contract.js';
import * as contractExports from '../stake.contract.js';
import { type PortfolioConfig } from '../typeGuards.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { executeOffer, startContract } from './supports.js';

test('onboarding: create staking portfolio', async (t) => {
  const common = await commonSetup(t);
  const startKit = await startContract<typeof startStake>(contractExports, {
    privateArgs: common.commonPrivateArgs,
  });
  const { instance, zoe } = startKit;

  const config: PortfolioConfig = harden({
    osmosis: {
      freq: 'daily',
      onReceipt: makeCopySet(['stake']),
      onRewards: makeCopySet(['restake']),
    },
  });
  const spec: OfferSpec = {
    id: 'msp-1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeStakingPortfolio',
      invitationArgs: [config],
    },
    proposal: {},
  };
  t.log(spec);

  const { vowTools } = common.utils;
  const { result, payouts } = await executeOffer(zoe, vowTools.when, spec);
  if (result === null || typeof result !== 'object') {
    throw t.is(typeof result, 'object');
  }
  t.deepEqual(Object.keys(result), ['invitationMakers']);
  t.deepEqual(payouts, {});
});
