// @ts-check
import { makeTracer } from '@agoric/internal';
import { CosmosChainAddressShape } from '@agoric/orchestration';
import { M, mustMatch } from '@endo/patterns';
import { RemoteConfigShape } from './typeGuards.js';

const trace = makeTracer('StkCTap');

/**
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainAddress, OrchestrationAccount} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {RemoteConfig} from './typeGuards.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any>;
 *   remoteChainAddress: CosmosChainAddress;
 *   assets: any;
 *   remoteChainInfo: any;
 *   stakePlan: RemoteConfig;
 * }} StakingTapState
 */

const InvitationMakerI = M.interface('invitationMaker', {});

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
 *   vowTools: VowTools;
 *   log: (msg: string) => Vow<void>;
 *   zoeTools: ZoeTools;
 * }} powers
 */
export const prepareStakeManagementKit = (zone, { zcf, vowTools, log }) => {
  return zone.exoClassKit(
    'StakeManagementTapKit',
    {
      facet2: M.interface('facet2', {
        ping: M.call().returns(),
      }),
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
      invitationMakers: {},
      // A multi-facet object must have multiple facets
      facet2: {
        ping() {
          trace('ping');
        },
      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareStakeManagementKit>} MakeStakeManagementKit */
/** @typedef {ReturnType<MakeStakeManagementKit>} StakeManagementKitKit */
