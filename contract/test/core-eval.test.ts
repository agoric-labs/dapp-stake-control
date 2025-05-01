/**
 * @file lightweight test for our coreEval code, using contractExports and such
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { AmountKeywordRecord, ZoeService } from '@agoric/zoe';
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
import { executeOffer } from './supports.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { PortfolioConfig } from '../typeGuards.js';
import { Fail } from '@endo/errors';

const { entries } = Object;

test('coreEval code without swingset', async (t) => {
  const { bootstrap, utils } = await commonSetup(t);
  const { agoricNamesAdmin } = bootstrap;
  const wk = await makeWellKnownSpaces(agoricNamesAdmin);
  const log = () => {}; // console.log
  const { produce, consume } = makePromiseSpace({ log });
  const powers = { produce, consume, ...wk } as StkBootPowers;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;
  const BLD = withAmountUtils(makeIssuerKit('BLD'));

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

    const IST = await (async () => {
      const issuer = await E(zoe).getFeeIssuer();
      const brand = await E(issuer).getBrand();
      return harden({ issuer, brand });
    })();

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
    startStakeManagement(powers, { options: { assetInfo: [], chainInfo: {} } }),
  );

  const { agoricNames } = bootstrap;
  const instance = (await E(agoricNames).lookup(
    'instance',
    'StkC',
  )) as Instance<contractExports.StartFn>;
  t.log('found StkC instance', instance);
  t.is(passStyleOf(instance), 'remotable');

  // XXX lots of code duplicated from stake.contract.test.ts
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
  const { vowTools } = utils;
  const { result, payouts } = await executeOffer(
    zoe,
    vowTools.when,
    spec,
    providePurse,
  );
});
