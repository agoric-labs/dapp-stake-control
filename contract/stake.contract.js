// @ts-check
import { makeTracer } from '@agoric/internal';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import * as makeStakingPortfolioFlows from './make-portfolio.flows.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import {
  customTermsShape,
  makeProposalShapes,
  PortfolioConfigShape,
  privateArgsShape,
} from './typeGuards.js';

const trace = makeTracer('StkC');

export const meta = {
  customTermsShape,
  privateArgsShape,
};
harden(meta);

/**
 * @import {Amount, Ratio} from '@agoric/ertp';
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {ChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {PortfolioConfig} from './typeGuards.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 */

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @typedef {{
 *   portfolioFee: Amount,
 *   commission?: Ratio,
 * }} StakingTerms
 *
 * @param {ZCF<StakingTerms>} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo: Record<string, ChainInfo>;
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
  const terms = zcf.getTerms();

  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    terms.brands,
    {
      agoric: fetchedChainInfo.agoric,
      osmosis: fetchedChainInfo.osmosis,
      noble: fetchedChainInfo.noble,
    },
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

  const { makeStakingPortfolio } = orchestrateAll(makeStakingPortfolioFlows, {
    makeStakeManagementKit,
    log,
  });

  const proposalShapes = makeProposalShapes(terms);
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
        return zcf.makeInvitation(
          makeStakingPortfolio,
          'makeLCA',
          undefined,
          proposalShapes.makePortfolio,
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
