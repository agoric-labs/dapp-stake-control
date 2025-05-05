/**
 * @file lightweight test for our coreEval code, using contractExports and such
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { ZoeService } from '@agoric/zoe';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E, passStyleOf } from '@endo/far';
import {
  startStakeManagement,
  type StkBootPowers,
} from '../../deploy/src/start-contract.js';
import * as contractExports from '../stake.contract.js';
import { commonSetup } from './fusdc-tools/supports.js';
import { makeCustomer, makeWallet } from './stake-actors.js';
import { validators } from './orch-tools/network-fakes.js';

const { entries } = Object;

test('coreEval code without swingset', async (t) => {
  const { bootstrap, utils, mocks } = await commonSetup(t);
  mocks.ibcBridge.setAddressPrefix('osmosis');
  const { agoricNamesAdmin } = bootstrap;
  const wk = await makeWellKnownSpaces(agoricNamesAdmin);
  const log = () => {}; // console.log
  const { produce, consume } = makePromiseSpace({ log });
  const powers = { produce, consume, ...wk } as StkBootPowers;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;
  const BLD = withAmountUtils(makeIssuerKit('BLD'));
  const IST = withAmountUtils(makeIssuerKit('IST'));

  {
    t.log('produce bootstrap entries from commonSetup()');
    for (const [n, v] of entries(bootstrap)) {
      switch (n) {
        case 'timer':
          produce.chainTimerService.resolve(v);
          break;
        case 'storage':
          produce.chainStorage.resolve(v.rootNode);
          break;
        default:
          produce[n].resolve(v);
      }
    }

    for (const [name, { brand, issuer }] of entries({ BLD, IST })) {
      t.log('produce brand, issuer for', name);
      wk.brand.produce[name].resolve(brand);
      wk.issuer.produce[name].resolve(issuer);
    }

    t.log('produce installation using test bundle');
    wk.installation.produce.StkC.resolve(bundleAndInstall(contractExports));

    t.log('produce startUpgradable');
    produce.startUpgradable.resolve(
      ({ label, installation, issuerKeywordRecord, privateArgs, terms }) =>
        E(zoe).startInstance(
          installation,
          issuerKeywordRecord,
          terms,
          privateArgs,
          label,
        ),
    );
  }

  t.log('invoke coreEval');
  await t.notThrowsAsync(
    startStakeManagement(powers, {
      options: { assetInfo: [], chainInfo: {}, validators },
    }),
  );

  const { agoricNames } = bootstrap;
  const instance = (await E(agoricNames).lookup(
    'instance',
    'StkC',
  )) as Instance<contractExports.StartFn>;
  t.log('found StkC instance', instance);
  t.is(passStyleOf(instance), 'remotable');
  const terms = await E(zoe).getTerms(instance);
  t.log('terms', terms);

  const { vowTools } = utils;
  const wallet = makeWallet({ IST, BLD }, zoe, vowTools.when);
  const silvia = makeCustomer(wallet, instance, terms);
  const { payouts } = await silvia.makePortfolio(t);
  const refund = await wallet.deposit(await payouts.Fee);
  t.log('TODO: contract should consume fee', refund);
  t.deepEqual(refund, terms.portfolioFee);
});
