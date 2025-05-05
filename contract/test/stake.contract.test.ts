import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { start as startStake } from '../stake.contract.js';
import { makeProposalShapes, type StkCTerms } from 'staking-contract';
import * as contractExports from '../stake.contract.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { makeCustomer, makeWallet } from './stake-actors.js';
import { startContract } from './supports.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { validators } from './orch-tools/network-fakes.js';
import { q } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';

test('onboarding: create staking portfolio', async (t) => {
  const common = await commonSetup(t);
  common.mocks.ibcBridge.setAddressPrefix('osmosis');
  const IST = withAmountUtils(makeIssuerKit('IST'));
  const BLD = withAmountUtils(makeIssuerKit('BLD'));
  const customTerms: StkCTerms = harden({
    portfolioFee: IST.make(2n),
    retainerMin: BLD.make(1n),
    validators,
  });
  const startKit = await startContract<typeof startStake>(contractExports, {
    terms: customTerms,
    issuers: { BLD: BLD.issuer, IST: IST.issuer },
    privateArgs: common.commonPrivateArgs,
  });
  const { instance, zoe } = startKit;

  const { vowTools } = common.utils;
  const wallet = makeWallet({ IST, BLD }, zoe, vowTools.when);
  const silvia = makeCustomer(wallet, instance, customTerms);

  const { result, payouts } = await silvia.makePortfolio(t);
  if (result === null || typeof result !== 'object') {
    throw t.is(typeof result, 'object');
  }
  t.deepEqual(Object.keys(result), ['invitationMakers', 'publicSubscribers']);
  const refund = await wallet.deposit(await payouts.Fee);
  t.log('TODO: contract should consume fee', refund);
  t.deepEqual(refund, customTerms.portfolioFee);

  t.log(result.publicSubscribers);
  const { storagePath } = result.publicSubscribers.portfolio;
  t.is(storagePath, 'fun.portfolios.portfolio123');
  await eventLoopIteration();

  const { storage } = common.bootstrap;
  const events = storage
    .getValues('fun.portfolios.portfolio123')
    .map((v) => JSON.parse(v));
  t.log('stored', storagePath, events);
  t.deepEqual(events, [
    {
      restaking: true,
      // XXX marshal brands, bigints
      retainerBalance: { brand: {}, value: '1' },
      staking: true,
      type: 'opened',
    },
    {
      amount: '123',
      denom: 'uosmo',
      restaking: true,
      retainerBalance: {
        brand: 'TODO',
        value: '0',
      },
      staking: true,
      type: 'deposit',
    },
    {
      balance: '0',
      denom: 'uosmo',
      quantity: '123',
      restaking: true,
      retainerBalance: {
        brand: 'TODO',
        value: '0',
      },
      staking: true,
      type: 'stake',
      validator: 'osmovaloper1q5xvvmf03dx8amz66ku6z0x4u39f0aphqf42wc',
    },
    {
      balance: '148',
      denom: 'uosmo',
      restaking: true,
      retainerBalance: {
        brand: 'TODO',
        value: '0',
      },
      staking: true,
      type: 'claim',
    },
    {
      balance: '123',
      denom: 'uosmo',
      quantity: '25',
      restaking: true,
      retainerBalance: {
        brand: 'TODO',
        value: '0',
      },
      staking: true,
      type: 'stake',
      validator: 'osmovaloper1q5xvvmf03dx8amz66ku6z0x4u39f0aphqf42wc',
    },
  ]);
});

test('print pattern', (t) => {
  const IST = withAmountUtils(makeIssuerKit('IST'));
  const BLD = withAmountUtils(makeIssuerKit('BLD'));
  const customTerms: StkCTerms = harden({
    portfolioFee: IST.make(2n * 1_000_000n),
    retainerMin: BLD.make(1n),
    validators,
  });
  const shapes = makeProposalShapes(customTerms);

  const { toCapData } = makeMarshal(undefined, undefined, {
    serializeBodyFormat: 'smallcaps',
  });
  const capData = toCapData(shapes);
  const printed = JSON.stringify(JSON.parse(capData.body.slice(1)), null, 2);
  t.log('shape', printed);
  t.pass();
});
