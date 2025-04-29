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

  const offerArgs: PortfolioConfig = {
    osmosis: {
      freqStake: 'daily',
      freqRestake: 'daily',
      onReceipt: makeCopySet(['stake']),
      onRewards: makeCopySet(['restake']),
    },
  };

  // TODO: setup makeAgdTools
  const brands = await t.context.vstorageClient.queryData(
    'published.agoricNames.brand',
  );
  const brand = Object.fromEntries(brands).BLD;

  const give = {
    Fee: { brand, value: 10n * 1000000n },
    Retainer: { brand, value: 50n * 1000000n },
  };

  const spec: OfferSpec = {
    id: 'msp-1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeStakingPortfolio',
    },
    offerArgs,
    proposal: {
      give,
    },
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
