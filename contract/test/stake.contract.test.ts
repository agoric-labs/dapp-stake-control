import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { StkCTerms, start as startStake } from '../stake.contract.js';
import * as contractExports from '../stake.contract.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { makeCustomer, makeWallet } from './stake-actors.js';
import { startContract } from './supports.js';

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

  const { vowTools } = common.utils;
  const wallet = makeWallet(BLD, zoe, vowTools.when);
  const silvia = makeCustomer(wallet, instance, BLD);

  const { result, payouts } = await silvia.makePortfolio(t);
  if (result === null || typeof result !== 'object') {
    throw t.is(typeof result, 'object');
  }
  t.deepEqual(Object.keys(result), ['invitationMakers', 'publicSubscribers']);
  const refund = wallet.deposit(await payouts.Fee);
  t.log('TODO: contract should consume fee', refund);
  t.deepEqual(refund, BLD.units(10));

  t.log(result.publicSubscribers);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.is(storagePath, 'fun.portfolios.portfolio123');

  const { storage } = common.bootstrap;
  const events = storage
    .getValues('fun.portfolios.portfolio123')
    .map((v) => JSON.parse(v));
  t.log('stored', storagePath, events);
  t.deepEqual(events, [
    {
      restaking: true,
      // XXX marshal brands, bigints
      retainerBalance: { brand: {}, value: '50000000' },
      staking: true,
      type: 'opened',
    },
  ]);
});
