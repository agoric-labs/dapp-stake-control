// @ts-check
import { makeTracer } from '@agoric/internal';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import * as makeStakingPortfolioFlows from './stake.flows.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import {
  customTermsShape,
  makeProposalShapes,
  privateArgsShape,
} from './typeGuards.js';

/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {ChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {Amount, Ratio} from '@agoric/ertp';
 */

const trace = makeTracer('StkC');

export const meta = {
  customTermsShape,
  privateArgsShape,
};
harden(meta);

/**
 * @typedef {{
 *   portfolioFee: Amount;
 *   commission?: Ratio,
 * }} StkCTerms
 */

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF<StkCTerms>} zcf
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
  { chainHub, orchestrateAll, vowTools },
) => {
  console.log('Inside Contract');
  const terms = zcf.getTerms();
  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    terms.brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  const makeStakeManagementKit = prepareStakeManagementKit(
    zone.subZone('StkCTap'),
    { zcf, vowTools },
  );

  const { makeStakingPortfolio } = orchestrateAll(makeStakingPortfolioFlows, {
    makeStakeManagementKit,
  });

  const proposalShapes = makeProposalShapes(terms);
  const publicFacet = zone.exo(
    'Staking API',
    M.interface('Staking API', {
      makeStakingPortfolio: M.callWhen().returns(InvitationShape),
    }),
    {
      makeStakingPortfolio() {
        trace('makeStakingPortfolio');
        return zcf.makeInvitation(
          makeStakingPortfolio,
          'makeStakingPortfolio',
          undefined, // custom details
          proposalShapes.makePortfolio,
        );
      },
    },
  );

  return { publicFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
/** @typedef {typeof start} StartFn */
