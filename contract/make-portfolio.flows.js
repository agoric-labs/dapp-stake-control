// @ts-check
import { Fail } from '@endo/errors';

const supportedChains = ['osmosis', 'cosmoshub'];
const allowedFrequencies = ['daily', 'weekly'];
const { entries } = Object;

/**
 * @import {GuestOf} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import {Vow} from '@agoric/vow';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   log: GuestOf<(msg: string) => Vow<void>>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   [chainName: string]: {
 *     freqStake: 'daily' | 'weekly';
 *     freqRestake: 'daily' | 'weekly';
 *     onReceipt: string[];
 *     onRewards: string[];
 *   }
 * }} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { log, makeStakeManagementKit },
  seat,
  offerArgs,
) => {
  void log('Inside makeStakingPortfolio');
  const [[chainName, plan]] = entries(offerArgs);
  const { freqStake, freqRestake, onReceipt, onRewards } = plan;
  console.log({ chainName, plan });

  if (!supportedChains.includes(chainName)) {
    Fail`Unsupported chain: ${chainName}`;
  }

  if (!allowedFrequencies.includes(freqStake)) {
    Fail`Invalid freqStake: ${freqStake}. Must be "daily" or "weekly".`;
  }

  if (!allowedFrequencies.includes(freqRestake)) {
    Fail`Invalid freqRestake: ${freqRestake}. Must be "daily" or "weekly".`;
  }

  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);

  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  const remoteAccount = await remoteChain.makeAccount();
  void log('Remote account created successfully');
  const remoteChainAddress = await remoteAccount.getAddress();
  console.log('Remote Chain Address:', remoteChainAddress);

  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();

  const stakeManagementKit = makeStakeManagementKit({
    remoteAccount,
    remoteChainAddress,
    assets,
    remoteChainInfo: info,
    stakePlan: { freqStake, freqRestake, onReceipt, onRewards },
  });

  seat.exit();
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(makeStakingPortfolio);
