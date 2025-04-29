// @ts-check
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { Fail } from '@endo/errors';
import { CosmosChainAddressShape } from '@agoric/orchestration';

const trace = makeTracer('StkCTap');

/**
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any>;
 *   remoteChainAddress: CosmosChainAddress;
 *   assets: any;
 *   remoteChainInfo: any;
 *   stakePlan: {
 *     freqStake: 'daily' | 'weekly';
 *     freqRestake: 'daily' | 'weekly';
 *     onReceipt: string[];
 *     onRewards: string[];
 *   };
 * }} StakingTapState
 */

const StakeManagementI = M.interface('holder', {
  stakeOnRemoteChain: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeStakeManagementInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

const StakingKitStateShape = {
  remoteChainAddress: CosmosChainAddressShape,
  remoteAccount: M.remotable('OrchestrationAccount<any>'),
  assets: M.any(),
  remoteChainInfo: M.any(),
  stakePlan: M.splitRecord({
    freqStake: M.or('daily', 'weekly'),
    freqRestake: M.or('daily', 'weekly'),
    onReceipt: M.setOf(M.or('stake')),
    onRewards: M.setOf(M.or('restake')),
  }),
};
harden(StakingKitStateShape);

/**
 * @param {Zone} zone
 * @param {{
 *   zcf: ZCF;
 *   vowTools: VowTools;
 *   log: (msg: string) => Vow<void>;
 *   zoeTools: ZoeTools;
 * }} powers
 */
export const prepareStakeManagementKit = (zone, { zcf, vowTools, log }) => {
  return zone.exoClassKit(
    'StakeManagementTapKit',
    {
      tap: M.interface('StakeManagementTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      transferWatcher: M.interface('TransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
      holder: StakeManagementI,
      invitationMakers: InvitationMakerI,
    },
    /**
     * @param {StakingTapState} initialState
     * @returns {StakingTapState}
     */
    (initialState) => {
      mustMatch(initialState, StakingKitStateShape);
      return harden({
        ...initialState,
      });
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);
          trace('receiveUpcall completed');
        },
      },
      transferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} value the qty of uatom to delegate
         */
        onFulfilled(_result, value) {
          trace('onFulfilled _result:', JSON.stringify(_result));
          trace('onFulfilled value:', JSON.stringify(value));
          trace('onFulfilled state:', JSON.stringify(this.state));
        },
      },
      holder: {
        /**
         * @param {ZCFSeat} seat
         * @param {{
         *   validatorAddress: string;
         *   stakeAmount: number;
         * }} offerArgs
         */
        async stakeOnRemoteChain(seat, offerArgs) {
          void log('Inside sendGmp');
          const { validatorAddress, stakeAmount } = offerArgs;

          trace('Offer Args:', JSON.stringify(offerArgs));

          validatorAddress != null || Fail`validatorAddress must be defined`;
          stakeAmount != null || Fail`stakeAmount must be defined`;

          // @ts-ignore
          await this.state.remoteAccount.delegate(
            validatorAddress,
            BigInt(stakeAmount),
          );

          seat.exit();
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeStakeManagementInvitation(method, args) {
          const continuingStakeManagementHandler = async (seat) => {
            const { holder } = this.facets;
            switch (method) {
              case 'stakeOsmo': {
                const vow = holder.stakeOnRemoteChain(seat, args[0]);
                return vowTools.when(vow, (res) => {
                  seat.exit();
                  return res;
                });
              }
              default:
                return 'Invalid method';
            }
          };

          return zcf.makeInvitation(
            continuingStakeManagementHandler,
            'stakeManagementTransaction',
          );
        },
      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareStakeManagementKit>} MakeStakeManagementKit */
/** @typedef {ReturnType<MakeStakeManagementKit>} StakeManagementKitKit */
