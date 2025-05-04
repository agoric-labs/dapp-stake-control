// @ts-check
import { makeTracer } from '@agoric/internal';
import { TimestampRecordShape } from '@agoric/time/src/typeGuards.js';
import {
  CosmosChainAddressShape,
  DenomAmountShape,
  DenomShape,
} from '@agoric/orchestration';
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
 * @import {Amount, NatValue} from '@agoric/ertp';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {TimestampRecord} from '@agoric/time/src/types';
 * @import {Remote, Vow, VowTools} from '@agoric/vow';
 * @import {HostInterface, } from '@agoric/async-flow';
 * @import {Zone} from '@agoric/zone';
 * @import {Denom, DenomAmount, OrchestrationAccount, CosmosValidatorAddress, StakingAccountActions, StakingAccountQueries} from '@agoric/orchestration';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {RemoteConfig} from './typeGuards.js';
 * @import {PortfolioEvent} from './types.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any> & StakingAccountActions & StakingAccountQueries;
 *   stakePlan: RemoteConfig;
 *   validatorAddress: CosmosValidatorAddress;
 *   remoteDenom: Denom;
 *   storageNode: Remote<StorageNode>;
 *   storagePath: string;
 * }} StakingInit
 */
/**
 * @typedef {StakingInit & {
 *   remoteAccount: HostInterface<StakingInit['remoteAccount']>;
 *   balance: NatValue
 * }} StakingTapState
 */

const InvitationMakerI = M.interface('invitationMaker', {});

/** @type {TypedPattern<StakingTapState>} */
const StakingKitStateShape = M.splitRecord(
  {
    remoteAccount: M.remotable('OrchestrationAccount'),
    stakePlan: RemoteConfigShape,
    // XXX move validator addr into stakePlan?
    validatorAddress: CosmosChainAddressShape,
    remoteDenom: DenomShape,
    storageNode: M.remotable('StorageNode'),
    storagePath: M.string(),
  },
  { balance: M.nat() },
);
harden(StakingKitStateShape);

const bigintReplacer = (p, v) => (typeof v === 'bigint' ? `${v}` : v);

/** @type {Amount<'nat'>} */
// @ts-expect-error TODO: track retainerBalance
const retainerBalance = { brand: 'TODO', value: 0n };
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
      internal: M.interface('internal', {
        onReceive: M.callWhen(M.nat()).returns(),
        onRewards: M.callWhen(M.arrayOf(DenomAmountShape)).returns(),
        stake: M.callWhen(M.nat()).returns(),
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
      internal: {
        /** @param {bigint} balance */
        async onReceive(balance) {
          const { storing, internal } = this.facets;
          const {
            remoteDenom: denom,
            balance: balancePre,
            stakePlan,
          } = this.state;
          Object.assign(this.state, { balance });

          const stakeAmount = balance - balancePre;
          storing.logEvent({
            type: 'deposit',
            amount: stakeAmount,
            denom,
            ...planProps(stakePlan),
            retainerBalance,
          });

          if ((stakePlan.onReceipt || []).includes('stake')) {
            internal.stake(stakeAmount);
          }
        },
        /** @param {bigint} stakeAmount */
        async stake(stakeAmount) {
          const {
            stakePlan,
            remoteDenom: denom,
            remoteAccount,
            validatorAddress,
            balance: balancePre,
          } = this.state;
          const { storing } = this.facets;

          // XXX not prompt!!!
          await vowTools.when(
            remoteAccount.delegate(validatorAddress, {
              denom: denom,
              value: BigInt(stakeAmount),
            }),
          );
          const balance = balancePre - stakeAmount;
          Object.assign(this.state, { balance });
          storing.logEvent({
            type: 'stake',
            balance,
            validator: validatorAddress.value,
            denom,
            quantity: stakeAmount,
            retainerBalance,
            ...planProps(stakePlan),
          });
        },
        /** @param {DenomAmount[]} rewardsEstimated */
        async onRewards(rewardsEstimated) {
          const {
            remoteAccount,
            validatorAddress,
            balance: balancePre,
            remoteDenom: denom,
            stakePlan,
          } = this.state;
          trace('estimated rewards', rewardsEstimated);

          // XXX not prompt!!!
          const [reward] = await vowTools.when(
            remoteAccount.withdrawReward(validatorAddress),
          );
          const { storing, internal } = this.facets;
          const balance = balancePre + reward.value;
          Object.assign(this.state, { balance });
          storing.logEvent({
            type: 'claim',
            balance,
            denom,
            retainerBalance,
            ...planProps(stakePlan),
          });

          if ((stakePlan.onRewards || []).includes('restake')) {
            internal.stake(reward.value);
          }
        },
      },
      polling: {
        /** @param {TimestampRecord} ts */
        async wake(ts) {
          trace('wake at', ts);
          const { remoteAccount, remoteDenom, balance, stakePlan } = this.state;
          const { internal } = this.facets;
          // XXX not prompt!!!
          const actual = await vowTools.when(
            remoteAccount.getBalance(remoteDenom),
          );
          actual.value >= balance ||
            Fail`who took tokens out??? ${actual.value} < ${balance}`;
          if (actual.value > balance && stakePlan.onReceipt) {
            internal.onReceive(actual.value);
          }

          const { validatorAddress } = this.state;

          // XXX not prompt!!!
          const rewards = await vowTools.when(
            remoteAccount.getReward(validatorAddress),
          );
          if (rewards && rewards.find((r) => r.value > 0n)) {
            internal.onRewards(rewards);
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

/** @typedef {ReturnType<ReturnType<typeof prepareStakeManagementKit>>} StakeManagementKit */
/** @typedef {(init: StakingInit) => StakeManagementKit} MakeStakeManagementKit */
