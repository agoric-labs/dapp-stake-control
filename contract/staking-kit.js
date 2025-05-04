// @ts-check
import { makeTracer } from '@agoric/internal';
import { TimestampRecordShape } from '@agoric/time/src/typeGuards.js';
import { DenomShape } from '@agoric/orchestration';
import { M, mustMatch } from '@endo/patterns';
import {
  planProps,
  PortfolioEventShape,
  PUBLIC_TOPICS,
  RemoteConfigShape,
} from './typeGuards.js';
import { E } from '@endo/far';
import { Fail } from '@endo/errors';

const trace = makeTracer('StkCTap');

/**
 * @import {NatValue} from '@agoric/ertp';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {TimestampRecord} from '@agoric/time/src/types';
 * @import {Remote, Vow, VowTools} from '@agoric/vow';
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {RemoteConfig} from './typeGuards.js';
 * @import {PortfolioEvent} from './types.js';
 */

/**
 * @typedef {{
 *   remoteAccount: HostInterface<OrchestrationAccount<any>>;
 *   stakePlan: RemoteConfig;
 *   remoteDenom: Denom;
 *   storageNode: Remote<StorageNode>;
 *   storagePath: string;
 *   balance: NatValue
 * }} StakingTapState
 */

const InvitationMakerI = M.interface('invitationMaker', {});

/** @type {TypedPattern<StakingTapState>} */
const StakingKitStateShape = M.splitRecord(
  {
    remoteAccount: M.remotable('OrchestrationAccount'),
    stakePlan: RemoteConfigShape,
    remoteDenom: DenomShape,
    storageNode: M.remotable('StorageNode'),
    storagePath: M.string(),
  },
  { balance: M.nat() },
);
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
      polling: M.interface('polling', {
        wake: M.call(TimestampRecordShape).returns(M.promise()),
      }),
    },
    /**
     * @param {StakingTapState} initialState
     * @returns {StakingTapState}
     */
    (initialState) => {
      mustMatch(initialState, StakingKitStateShape);
      return harden({ ...initialState, balance: 0n });
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
      polling: {
        /** @param {TimestampRecord} ts */
        async wake(ts) {
          trace('wake at', ts);
          const { remoteAccount, remoteDenom, balance, stakePlan } = this.state;
          // XXX not prompt!!!
          const actual = await vowTools.when(
            remoteAccount.getBalance(remoteDenom),
          );
          actual.value >= balance ||
            Fail`who took tokens out??? ${actual.value} < ${balance}`;
          if (actual.value > balance) {
            const { storing } = this.facets;
            storing.logEvent({
              type: 'deposit',
              amount: actual.value,
              denom: remoteDenom,
              ...planProps(stakePlan),
              retainerBalance: { brand: 'TODO', value: 0n },
            });
          }
        },
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
