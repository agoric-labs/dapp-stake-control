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
 * @import {PortfolioConfig, PollingFrequency, Validator} from './typeGuards.js'
 * @import {PortfolioEvent} from './types.js';
 * @import {PollingKit} from './polling-kit.js';
 */

/**
 * @typedef {Object} Validator
 * @property {string} moniker
 * @property {string} operator_address
 * @property {number} commission_rate
 * @property {string} tokens
 */

/**
 * Select the best validator for a given chain using a filter function
 * @param {string} chain - Chain name in lowercase (e.g., 'osmosis')
 * @param {Record<string, Validator[]>} allValidators - Map of chain → validators
 * @param {(v: Validator) => boolean} filterFn - Filter logic for picking a good validator
 * @returns { `${string}valoper1${string}` | undefined} - The selected validator, or undefined if none match
 */
const selectBestValidatorForChain = (chain, allValidators, filterFn) => {
  const validators = allValidators[chain];
  if (!validators || validators.length === 0) return undefined;

  const filtered = validators.filter(filterFn);
  if (filtered.length === 0) return undefined;

  return filtered[0].operator_address;
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   makeStorageKit: (id: bigint) => Promise<{node:StorageNode,path:string}>;
 *   stores: MapStore<PollingFrequency, PollingKit['store']>;
 *   validators: Record<string, Validator[]>
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { makeStakeManagementKit, makeStorageKit, stores, validators },
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

  const selectedValidator = selectBestValidatorForChain(
    chainName,
    validators,
    (v) => {
      return v.commission_rate <= 0.05 && parseInt(v.tokens) > 1_000_000;
    },
  );
  trace('Validator Address:', selectedValidator);

  if (!selectedValidator) {
    Fail`No suitable validator found for ${chainName}`;
    return;
  }

  const stakeManagementKit = makeStakeManagementKit({
    remoteAccount,
    stakePlan: plan,
    validatorAddress: {
      chainId,
      value: selectedValidator,
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
