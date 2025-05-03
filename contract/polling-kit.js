// @ts-check
import { makeTracer } from '@agoric/internal';
import { observeIteration } from '@agoric/notifier';
import { E } from '@endo/far';

const trace = makeTracer('PolK');
const ifaceTODO = undefined;

/**
 * @import {MapStore} from '@agoric/store';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {RelativeTime, TimerServiceCommon, TimestampRecord} from '@agoric/time/src/types';
 * @import {Notifier} from '@agoric/notifier';
 */

/**
 * @typedef {{
 *   wake(ts: TimestampRecord): Promise<void>
 * }} PollItem
 */

/**
 * @param {Zone} zoneP
 * @param {Remote<TimerServiceCommon>} timerService
 */
export const preparePollingKit = (zoneP, timerService) => {
  const makeCancelToken = zoneP.exoClass('Cancel', undefined, () => ({}), {});
  const makePollingKit = zoneP.exoClassKit(
    'PollingKit',
    ifaceTODO,
    /**
     * @param {RelativeTime} interval
     */
    (interval) => {
      return {
        interval,
        nextKey: 0n,
        /** @type {MapStore<bigint, PollItem>} */
        portfolios: zoneP.detached().mapStore('portfolio'),
        /** @type {Notifier<TimestampRecord> | undefined} */
        notifier: undefined,
        cancelToken: /** @type {{} | undefined} */ (undefined),
      };
    },
    {
      store: {
        /** @param {PollItem} it */
        addItem(it) {
          const { nextKey, portfolios } = this.state;
          portfolios.init(nextKey, it);
          this.state.nextKey = nextKey + 1n;
          this.facets.admin.start();
          return this.state.nextKey;
        },
      },
      admin: {
        async start() {
          if (this.state.notifier) {
            console.warn('already started');
            return;
          }
          const { interval } = this.state;
          const cancelToken = makeCancelToken();
          const notifier = await E(timerService).makeNotifier(
            0n,
            interval,
            cancelToken,
          );
          Object.assign(this.state, { cancelToken, notifier });
          // TODO: clean up observer when done
          void observeIteration(notifier, this.facets.observer);
        },
        async stop() {
          const { cancelToken } = this.state;
          /* c8 ignore next */
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
            trace('waking', portfolio, timestamp);
            try {
              void portfolio.wake(timestamp);
              /* c8 ignore next 3 */
            } catch (error) {
              console.error('ignoring error from wake() of', portfolio);
            }
          }
        },
        finish(completion) {
          trace('TODO: finish', completion);
        },
        /* c8 ignore next 3 */
        fail(reason) {
          trace('TODO: fail', reason);
        },
      },
    },
  );
  return makePollingKit;
};

/** @typedef {ReturnType<ReturnType<typeof preparePollingKit>>} PollingKit */
