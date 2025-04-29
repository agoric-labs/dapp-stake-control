// @ts-check
import { mustMatch } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { PortfolioConfigShape } from './typeGuards.js';

const supportedChains = ['osmosis', 'cosmoshub'];
const { entries, values } = Object;

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
 *   log: (msg: string) => Promise<void>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { log, makeStakeManagementKit },
  seat,
  offerArgs,
) => {
  void log('Inside makeStakingPortfolio');
  mustMatch(offerArgs, PortfolioConfigShape);
  entries(offerArgs).length === 1 || Fail`only 1 remote currently supported`;
  const [[chainName, plan]] = entries(offerArgs);
  console.log({ chainName, plan });

  supportedChains.includes(chainName) || Fail`Unsupported chain: ${chainName}`;

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
    stakePlan: plan,
  });

  seat.exit();
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(makeStakingPortfolio);
