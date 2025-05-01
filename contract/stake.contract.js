// @ts-check
import { makeTracer } from '@agoric/internal';
import { observeIteration } from '@agoric/notifier';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import * as stakingFlows from './make-portfolio.flows.js';
import { prepareStakeManagementKit } from './staking-kit.js';
import {
  customTermsShape,
  makeProposalShapes,
  PollingFrequency,
  PortfolioConfigShape,
  privateArgsShape,
} from './typeGuards.js';

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
 * @import {TimerServiceCommon, TimestampRecord} from '@agoric/time/src/types';
 * @import {Notifier} from '@agoric/notifier';
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

  const makeStakeManagementKit = prepareStakeManagementKit(
    zone.subZone('StkCTap'),
    {
      zcf,
      zoeTools,
    },
  );

  const ifaceTODO = undefined;
  const zoneP = zone.subZone('polling');
  const makeCancelToken = zoneP.exoClass('Cancel', undefined, () => {}, {});
  const makePollingKit = zoneP.exoClassKit(
    'PollingKit',
    ifaceTODO,
    () => {
      return {
        nextKey: 0n,
        portfolios: zoneP.detached().mapStore('portfolio'),
        notifier: /** @type {Notifier<TimestampRecord> | undefined} */ (
          undefined
        ),
        cancelToken: /** @type {{} | undefined} */ (undefined),
      };
    },
    {
      admin: {
        addPortfolio(it) {
          const { nextKey, portfolios } = this.state;
          portfolios.init(nextKey, it);
          this.state.nextKey = nextKey + 1n;
          if (it.freq) {
            this.facets.admin.start();
          }
        },
        async start() {
          if (this.state.cancelToken) {
            console.warn('already started');
            return;
          }
          const cancelToken = makeCancelToken();
          const notifier = await E(timerService).makeNotifier(
            0n,
            5n,
            cancelToken,
          );
          Object.assign(this.state, { cancelToken, notifier });
          void observeIteration(notifier, this.facets.observer);
        },
        async stop() {
          const { cancelToken } = this.state;
          if (!cancelToken) return;
          await E(timerService).cancel(cancelToken);
          Object.assign(this.state, {
            cancelToken: undefined,
            notifier: undefined,
          });
        },
      },
      observer: {
        /** @param {TimestampRecord} timestamp */
        updateState(timestamp) {
          const { portfolios } = this.state;
          // TODO what to do if there are LOTS?
          for (const portfolio of portfolios.values()) {
            portfolio.poll();
          }
          trace('TODO: updateState', timestamp);
        },
        finish(completion) {
          trace('TODO: finish', completion);
        },
        fail(reason) {
          trace('TODO: fail', reason);
        },
      },
    },
  );
  const { values } = Object;
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

  const { makeStakingPortfolio } = orchestrateAll(stakingFlows, {
    makeStakeManagementKit,
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
