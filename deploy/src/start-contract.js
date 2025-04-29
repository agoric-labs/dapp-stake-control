import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

/**
 * @import {Installation, Instance} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {start as StartFn} from '../../contract/stake.contract.js';
 */

const trace = makeTracer('start stakeManagement', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       stakeManagement: Installation<StartFn>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       stakeManagement: Producer<Instance>;
 *     };
 *   };
 *   issuer: {
 *     consume: {
 *       BLD: Issuer<'nat'>;
 *       IST: Issuer<'nat'>;
 *     };
 *   };
 * }} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
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
    installation: {
      consume: { stakeManagement },
    },
    instance: {
      produce: { stakeManagement: produceInstance },
    },
    issuer: {
      consume: { BLD, IST },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(startStakeManagement.name);

  const marshaller = await E(board).getReadonlyMarshaller();

  trace('Setting privateArgs');

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode('StkC'),
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
    label: 'stakeManagement',
    installation: stakeManagement,
    issuerKeywordRecord,
    privateArgs,
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
        installation: {
          consume: { stakeManagement: true },
        },
        instance: {
          produce: { stakeManagement: true },
        },
        issuer: {
          consume: { BLD: true, IST: true },
        },
      },
    },
    installations: {
      stakeManagement: restoreRef(installationRef),
    },
    options,
  };
};
