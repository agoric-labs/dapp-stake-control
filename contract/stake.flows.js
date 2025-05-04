// @ts-check
import { makeTracer, mustMatch } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { planProps, PortfolioConfigShape } from './typeGuards.js';

const trace = makeTracer('flows');
const { entries } = Object;

/**
 * @import {MapStore} from '@agoric/store';
 * @import {Orchestrator, OrchestrationFlow, OrchestrationAccount, StakingAccountActions, StakingAccountQueries, CosmosChainInfo} from '@agoric/orchestration';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import {PortfolioConfig, PollingFrequency} from './typeGuards.js'
 * @import {PortfolioEvent} from './types.js';
 * @import {PollingKit} from './polling-kit.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   makeStorageKit: (id: bigint) => Promise<{node:StorageNode,path:string}>;
 *   stores: MapStore<PollingFrequency, PollingKit['store']>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { makeStakeManagementKit, makeStorageKit, stores },
  seat,
  offerArgs,
) => {
  trace('Inside makeStakingPortfolio');
  mustMatch(offerArgs, PortfolioConfigShape);
  entries(offerArgs).length === 1 || Fail`only 1 remote currently supported`;
  const [[chainName, plan]] = entries(offerArgs);
  trace({ chainName, plan });

  const remoteChain = await orch.getChain(chainName);

  /** @type {CosmosChainInfo} */
  const { namespace, chainId, stakingTokens, bech32Prefix } =
    await remoteChain.getChainInfo();
  namespace === 'cosmos' || Fail`expected cosmos; got ${namespace}`;
  if (!(stakingTokens && stakingTokens.length > 0))
    throw assert.error(`${chainName} does not have stakingTokens in config`);
  const [{ denom: remoteDenom }] = stakingTokens;

  trace('Creating Remote account...');
  /** @type {OrchestrationAccount<any> & StakingAccountActions & StakingAccountQueries} */
  // @ts-expect-error
  const remoteAccount = await remoteChain.makeAccount();
  trace('Remote account created successfully');

  const id = 123n; // TODO
  const { node, path } = await makeStorageKit(id);

  const stakeManagementKit = makeStakeManagementKit({
    remoteAccount,
    stakePlan: plan,
    // TODO: get validatorAddress from user or from build-time config
    validatorAddress: {
      chainId,
      // @ts-expect-error XXX TODO
      value: `${bech32Prefix}valoper1TODODO`,
      encoding: 'bech32',
    },
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

  if (plan.freq) {
    stores.get(plan.freq).addItem(stakeManagementKit.polling);
  }

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
