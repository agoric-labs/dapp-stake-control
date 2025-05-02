// @ts-check
import { makeTracer } from '@agoric/internal';
import { CosmosChainAddressShape } from '@agoric/orchestration';
import { Fail } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';
import { PUBLIC_TOPICS, RemoteConfigShape } from './typeGuards.js';

const trace = makeTracer('StkC');

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {MakeRecorderKit, RecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {RemoteConfig} from './typeGuards.js';
 * @import {PortfolioEvent} from './stake-types.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any>;
 *   remoteChainAddress: CosmosChainAddress;
 *   assets: any;
 *   remoteChainInfo: any;
 *   stakePlan: RemoteConfig;
 *   topicKit: RecorderKit<PortfolioEvent>;
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
  remoteAccount: M.remotable('OrchestrationAccount'),
  assets: M.any(),
  remoteChainInfo: M.any(),
  stakePlan: RemoteConfigShape,
};
harden(StakingKitStateShape);

/**
 * @param {Zone} zone
 * @param {{
 *   zcf: ZCF;
 *   zoeTools: ZoeTools;
 *   makeRecorderKit: MakeRecorderKit;
 * }} powers
 */
export const prepareStakeManagementKit = (zone, { zcf, makeRecorderKit }) => {
  return zone.exoClassKit(
    'StakeManagementTapKit',
    {
      holder: StakeManagementI,
      invitationMakers: InvitationMakerI,
    },
    /**
     * @param {Omit<StakingTapState, 'topicKit'>} initialState
     * @param {StorageNode} storageNode
     * @returns {StakingTapState}
     */
    (initialState, storageNode) => {
      mustMatch(initialState, StakingKitStateShape);
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.portfolio[1]);
      return harden({ ...initialState, topicKit });
    },
    {
      holder: {
        /**
         * @param {ZCFSeat} seat
         * @param {{
         *   validatorAddress: string;
         *   stakeAmount: number;
         * }} offerArgs
         */
        async stakeOnRemoteChain(seat, offerArgs) {
          trace('Inside sendGmp');
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
                return holder.stakeOnRemoteChain(seat, args[0]);
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
