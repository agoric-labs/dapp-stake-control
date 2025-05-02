import { makeTracer } from '@agoric/internal';
import { observeIteration } from '@agoric/notifier';
import { E } from '@endo/far';

const trace = makeTracer('PolK');
const ifaceTODO = undefined;

/**
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TimerServiceCommon, TimestampRecord} from '@agoric/time/src/types';
 * @import {Notifier} from '@agoric/notifier';
 */

/**
 * @param {Zone} zoneP
 * @param {Remote<TimerServiceCommon>} timerService
 * @returns
 */
export const preparePollingKit = (zoneP, timerService) => {
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
  return makePollingKit;
};
