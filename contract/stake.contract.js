// @ts-check
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { PortfolioConfigShape } from './typeGuards.js';
import * as lcaFlows from './create-lca.flows.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import { makeTracer } from '@agoric/internal';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';

const trace = makeTracer('StkC');

/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {PortfolioConfig} from './typeGuards.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 */

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo: Record<string, CosmosChainInfo>;
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 *   storageNode: Remote<StorageNode>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (
  zcf,
  privateArgs,
  zone,
  { chainHub, orchestrateAll, vowTools, zoeTools },
) => {
  console.log('Inside Contract');

  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    { agoric: fetchedChainInfo.agoric, osmosis: fetchedChainInfo.osmosis },
    privateArgs.assetInfo,
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = (msg) => vowTools.watch(E(logNode).setValue(msg));

  const makeStakeManagementKit = prepareStakeManagementKit(
    zone.subZone('StkCTap'),
    {
      zcf,
      vowTools,
      log,
      zoeTools,
    },
  );

  const { createAndMonitorLCA } = orchestrateAll(lcaFlows, {
    makeStakeManagementKit,
    log,
  });

  const publicFacet = zone.exo(
    'Staking API',
    M.interface('Staking API', {
      makeStakingPortfolio: M.callWhen()
        .optional(PortfolioConfigShape)
        .returns(InvitationShape),
    }),
    {
      /** @param {PortfolioConfig} config */
      makeStakingPortfolio(config) {
        trace('makeStakingPortfolio(', config, ')');
        return zcf.makeInvitation(createAndMonitorLCA, 'makeLCA', undefined);
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
