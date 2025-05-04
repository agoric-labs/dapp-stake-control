// @ts-check
import { makeTracer, mustMatch } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { planProps, PortfolioConfigShape } from './typeGuards.js';

const trace = makeTracer('flows');
const { entries } = Object;

/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import {PortfolioConfig} from './typeGuards.js'
 * @import {PortfolioEvent} from './types.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   makeStorageKit: (id: bigint) => Promise<{node:StorageNode,path:string}>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { makeStakeManagementKit, makeStorageKit },
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

  const id = 123n; // TODO
  const { node, path } = await makeStorageKit(id);

  const stakeManagementKit = makeStakeManagementKit({
    remoteAccount,
    stakePlan: plan,
    remoteDenom,
    storageNode: node,
    storagePath: path,
  });

  seat.exit();
  const publicSubscribers = stakeManagementKit.topics.getPublicTopics();
  const result = harden({
    invitationMakers: stakeManagementKit.invitationMakers,
    publicSubscribers,
  });

  /** @type {PortfolioEvent} */
  const e0 = {
    type: 'opened',
    // TODO: stakeManagementKit.foo.getRetainerBalance()
    retainerBalance: seat.getProposal().give.Retainer,
    ...planProps(plan),
  };
  stakeManagementKit.storing.logEvent(e0);
  return result;
};
harden(makeStakingPortfolio);
