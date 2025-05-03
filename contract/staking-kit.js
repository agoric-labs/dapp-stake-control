// @ts-check
import { makeTracer } from '@agoric/internal';
import { DenomShape } from '@agoric/orchestration';
import { M, mustMatch } from '@endo/patterns';
import {
  PortfolioEventShape,
  PUBLIC_TOPICS,
  RemoteConfigShape,
} from './typeGuards.js';
import { E } from '@endo/far';

const trace = makeTracer('StkCTap');

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {Remote, Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {RemoteConfig} from './typeGuards.js';
 * @import {PortfolioEvent} from './types.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any>;
 *   stakePlan: RemoteConfig;
 *   remoteDenom: Denom;
 *   storageNode: Remote<StorageNode>;
 *   storagePath: string;
 * }} StakingTapState
 */

const InvitationMakerI = M.interface('invitationMaker', {});

/** @type {TypedPattern<StakingTapState>} */
const StakingKitStateShape = M.splitRecord({
  remoteAccount: M.remotable('OrchestrationAccount'),
  stakePlan: RemoteConfigShape,
  remoteDenom: DenomShape,
  storageNode: M.remotable('StorageNode'),
  storagePath: M.string(),
});
harden(StakingKitStateShape);

const bigintReplacer = (p, v) => (typeof v === 'bigint' ? `${v}` : v);

/**
 * @param {Zone} zone
 * @param {{
 *   zcf: ZCF;
 *   vowTools: VowTools;
 * }} powers
 */
export const prepareStakeManagementKit = (zone, { zcf, vowTools }) => {
  return zone.exoClassKit(
    'StakeManagementTapKit',
    {
      topics: M.interface('topics', {
        getPublicTopics: M.call().returns(M.record()),
      }),
      storing: M.interface('storing', {
        logEvent: M.call(PortfolioEventShape).returns(),
      }),
      invitationMakers: InvitationMakerI,
    },
    /**
     * @param {StakingTapState} initialState
     * @returns {StakingTapState}
     */
    (initialState) => {
      mustMatch(initialState, StakingKitStateShape);
      return harden({ ...initialState });
    },
    {
      topics: {
        getPublicTopics() {
          const { storagePath } = this.state;
          return harden({
            portfolio: {
              description: PUBLIC_TOPICS.portfolio[0],
              // TODO: subscriber: topicKit.subscriber,
              storagePath,
            },
          });
        },
      },
      storing: {
        /** @param {PortfolioEvent} event */
        logEvent(event) {
          const { storageNode } = this.state;
          const value = JSON.stringify(event, bigintReplacer); // TODO: marshal?

          // TODO: publish on-chain subscribers

          // fire-and-forget calls to vstorage
          void E(storageNode).setValue(value);
        },
      },
      invitationMakers: {
        // TODO: invitation to wind down the portfolio?
      },
    },
    {
      finish: ({ state }) => {
        const { storageNode } = state;
        // eventually replace 'PENDING' with actual storage path
        void E.when(E(storageNode).getPath(), (path) => {
          trace('finish: storagePath:', path);
          state.storagePath = path;
        });
      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareStakeManagementKit>} MakeStakeManagementKit */
/** @typedef {ReturnType<MakeStakeManagementKit>} StakeManagementKit */
