// @ts-check
import { makeTracer } from '@agoric/internal';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import * as stakingFlows from './make-portfolio.flows.js';
import { preparePollingKit } from './polling-kit.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import {
  customTermsShape,
  makeProposalShapes,
  PollingFrequency,
  PortfolioConfigShape,
  privateArgsShape,
} from './typeGuards.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';

/**
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {ChainInfo, Denom, DenomArg, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {PortfolioConfig} from './typeGuards.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {Amount, Ratio} from '@agoric/ertp';
 * @import {OrchestrationAccount} from '@agoric/orchestration';
 * @import {TimerServiceCommon} from '@agoric/time/src/types';
 */

const trace = makeTracer('StkC');
const { values } = Object;

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
  trace('Inside Contract');
  const terms = zcf.getTerms();

  /**
   * @type {Remote<TimerServiceCommon>}
   * XXX something is odd about the TimerService type; it's any???
   */
  const timerService = privateArgs.timerService;
  const { chainInfo, assetInfo } = privateArgs;

  trace('Registering Chain and Assets....');
  registerChainsAndAssets(chainHub, terms.brands, chainInfo, assetInfo);

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const { makeRecorderKit } = prepareRecorderKitMakers(
    zone.subZone('recorders').mapStore('recorderKit baggage'),
    privateArgs.marshaller,
  );

  const makeStakeManagementKit = prepareStakeManagementKit(
    zone.subZone('StkCTap'),
    {
      zcf,
      zoeTools,
      makeRecorderKit,
    },
  );

  const zoneP = zone.subZone('polling');
  const makePollingKit = preparePollingKit(zoneP, timerService);
  const byFreq = zoneP.mapStore('byFreq');
  byFreq.addAll(
    values(PollingFrequency).map((freq) => [freq, makePollingKit()]),
  );

  const FREQ_INTERVALS = {
    daily: 86400n,
    weekly: 604800n,
  };
  const STAKE_LIMIT = 20;

  /**
   * @param {"daily" | "weekly"} freq - How often to poll.
   * @param {OrchestrationAccount<any>} remoteAccount - Account to poll.
   * @param {DenomArg} denom
   */
  const poll = (freq, remoteAccount, denom) => {
    assert(['daily', 'weekly'].includes(freq), `Invalid frequency: ${freq}`);

    const repeaterP = E(timerService).makeRepeater(0n, FREQ_INTERVALS[freq]);
    const schedule = E(repeaterP);

    const handler = Far('handler', {
      async wake(timestamp) {
        const denomAmount = await remoteAccount.getBalance(denom);
        if (denomAmount.value >= STAKE_LIMIT) {
          // TODO
        }
      },
    });

    schedule.schedule(handler);
  };

  /** @param {bigint} id */
  const makeStorageNode = (id) =>
    E(E(privateArgs.storageNode).makeChildNode(`portfolios`)).makeChildNode(
      `portfolio${id}`,
    );

  const { makeStakingPortfolio } = orchestrateAll(stakingFlows, {
    makeStakeManagementKit,
    makeStorageNode,
    poll,
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
          'makeStakingPortfolio',
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
/** @typedef {typeof start} StartFn */
