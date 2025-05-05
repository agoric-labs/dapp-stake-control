// @ts-check
import { makeTracer } from '@agoric/internal';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import * as stakingFlows from './stake.flows.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import {
  customTermsShape,
  makeProposalShapes,
  PollingFrequency,
  privateArgsShape,
} from './typeGuards.js';
import { preparePollingKit } from './polling-kit.js';

/**
 * @import {MapStore} from '@agoric/store';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {ChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller, StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {PollingKit} from './polling-kit.js';
 * @import {StkCTerms} from './typeGuards.js'
 */

const trace = makeTracer('StkC');
const { values } = Object;

export const meta = {
  customTermsShape,
  privateArgsShape,
};
harden(meta);

const HR = 1n; // TODO: 60n * 60n
const FREQ_INTERVALS = {
  daily: 24n * HR,
  weekly: 7n * 24n * HR,
};

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

  const portfoliosNodeP = E(privateArgs.storageNode).makeChildNode(
    `portfolios`,
  );
  /** @param {bigint} id */
  const makeStorageKit = (id) =>
    vowTools.asVow(async () => {
      const nodeP = E(portfoliosNodeP).makeChildNode(`portfolio${id}`);
      const pathP = E(nodeP).getPath();
      const [node, path] = await Promise.all([nodeP, pathP]);
      return { node, path };
    });

  const zoneP = zone.subZone('polling');
  const makePollingKit = preparePollingKit(zoneP, privateArgs.timerService);
  /** @type {MapStore<PollingFrequency, PollingKit>} */
  const byFreq = zoneP.mapStore('byFreq');
  byFreq.addAll(
    values(PollingFrequency).map((freq) => [
      freq,
      makePollingKit(FREQ_INTERVALS[freq]),
    ]),
  );
  /** @type {MapStore<PollingFrequency, PollingKit['store']>} */
  const pollStores = zoneP.mapStore('storeByFreq');
  for (const [freq, kit] of byFreq.entries()) {
    pollStores.init(freq, kit.store);
  }

  const { makeStakingPortfolio } = orchestrateAll(stakingFlows, {
    makeStakeManagementKit,
    makeStorageKit,
    stores: pollStores,
    validators: zcf.getTerms().validators,
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
