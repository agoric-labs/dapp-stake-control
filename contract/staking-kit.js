// @ts-check
import { makeTracer } from '@agoric/internal';
import { DenomShape } from '@agoric/orchestration';
import { M, mustMatch } from '@endo/patterns';
import { RemoteConfigShape } from './typeGuards.js';

const trace = makeTracer('StkCTap');

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {RemoteConfig} from './typeGuards.js';
 */

/**
 * @typedef {{
 *   remoteAccount: OrchestrationAccount<any>;
 *   stakePlan: RemoteConfig;
 *   remoteDenom: Denom;
 * }} StakingTapState
 */

const InvitationMakerI = M.interface('invitationMaker', {});

/** @type {TypedPattern<StakingTapState>} */
const StakingKitStateShape = {
  remoteAccount: M.remotable('OrchestrationAccount'),
  stakePlan: RemoteConfigShape,
  remoteDenom: DenomShape,
};
harden(StakingKitStateShape);

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
/** @typedef {ReturnType<MakeStakeManagementKit>} StakeManagementKit */
