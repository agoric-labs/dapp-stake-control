// @ts-check
import { makeTracer, mustMatch } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { PortfolioConfigShape } from './typeGuards.js';

const trace = makeTracer('flows');
const { entries } = Object;

/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {PortfolioConfig} from './typeGuards.js'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { makeStakeManagementKit },
  seat,
  offerArgs,
) => {
  trace('Inside makeStakingPortfolio');
  mustMatch(offerArgs, PortfolioConfigShape);
  entries(offerArgs).length === 1 || Fail`only 1 remote currently supported`;
  const [[chainName, plan]] = entries(offerArgs);
  trace({ chainName, plan });

  const remoteChain = await orch.getChain(chainName);

  const { stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainName} does not have stakingTokens in config`;

  trace('Creating Remote account...');
  const remoteAccount = await remoteChain.makeAccount();
  trace('Remote account created successfully');

  const stakeManagementKit = makeStakeManagementKit({
    remoteAccount,
    stakePlan: plan,
    remoteDenom,
  });

  seat.exit();
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(makeStakingPortfolio);
