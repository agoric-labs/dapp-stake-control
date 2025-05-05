// TODO: BootstrapPowers ambient types
// @ts-nocheck
import { AmountMath } from '@agoric/ertp';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

/**
 * @import {Issuer} from '@agoric/ertp';
 * @import {Installation, Instance} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {StartFn, StkCTerms} from '../../contract/stake.contract.js';
 * @import {TimerService} from '@agoric/time';
 * @import {Validator} from 'staking-contract';
 */

const trace = makeTracer('start StkC', true);

/**
 * @typedef {BootstrapPowers & PromiseSpaceOf<{
 *     chainStorage: StorageNode;
 *     chainTimerService: TimerService;
 *   }> & {
 *   installation: PromiseSpaceOf<{ StkC: Installation<StartFn>}>;
 *   instance: PromiseSpaceOf<{ StkC: Producer<Instance<StartFn>> }>;
 * }} StkBootPowers
 * @param {StkBootPowers} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 *     validators: Record<string, Validator[]>;
 *   };
 * }} config
 */
export const startStakeManagement = async (
  {
    consume: {
      agoricNames,
      board,
      chainStorage,
      chainTimerService,
      cosmosInterchainService,
      localchain,
      startUpgradable,
    },
    brand: {
      consume: { BLD: bldBrandP },
    },
    installation: {
      consume: { StkC },
    },
    instance: {
      produce: { StkC: produceInstance },
    },
    issuer: {
      consume: { BLD, IST },
    },
  },
  { options: { chainInfo, assetInfo, validators } },
) => {
  trace(startStakeManagement.name);

  /** @type {StkCTerms} */
  const terms = {
    portfolioFee: AmountMath.make(await bldBrandP, 10n * 1_000_000n),
    validators,
  };

  const marshaller = await E(board).getReadonlyMarshaller();

  trace('Setting privateArgs');

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(chainStorage).makeChildNode('StkC'),
      timerService: chainTimerService,
      chainInfo,
      assetInfo,
    }),
  );

  /** @param {() => Promise<Issuer>} p */
  const safeFulfill = async (p) =>
    E.when(
      p(),
      (i) => i,
      () => undefined,
    );

  // const osmoIssuer = await safeFulfill(() =>
  //   E(agoricNames).lookup('issuer', 'OSMO')
  // );

  const issuerKeywordRecord = harden({
    BLD: await BLD,
    IST: await IST,
    // ...(osmoIssuer && { OSMO: osmoIssuer }),
  });
  trace('issuerKeywordRecord', issuerKeywordRecord);

  trace('Starting contract instance');
  const { instance } = await E(startUpgradable)({
    label: 'StkC',
    installation: StkC,
    issuerKeywordRecord,
    privateArgs,
    terms,
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startStakeManagement);

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startStakeManagement.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainTimerService: true,
          chainStorage: true,
          cosmosInterchainService: true,
          localchain: true,
          startUpgradable: true,
        },
        brand: { consume: { BLD: true } },
        installation: {
          consume: { StkC: true },
        },
        instance: {
          produce: { StkC: true },
        },
        issuer: {
          consume: { BLD: true, IST: true },
        },
      },
    },
    installations: {
      StkC: restoreRef(installationRef),
    },
    options,
  };
};
