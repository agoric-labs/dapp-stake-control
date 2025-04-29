// @ts-check
import { Fail } from '@endo/errors';

const supportedChains = ['osmosis', 'cosmoshub'];
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
 *     freq: string;
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
  const { freq, onReceipt, onRewards } = plan;

  for (const chain of Object.keys(offerArgs)) {
    if (!supportedChains.includes(chain)) {
      Fail`Unsupported chain: ${chain}`;
    }
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
    stakePlan: { freq, onReceipt, onRewards },
  });

  seat.exit();
  void log('Done');
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(makeStakingPortfolio);
