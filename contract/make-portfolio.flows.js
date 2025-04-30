// @ts-check
import { mustMatch } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { PortfolioConfigShape } from './typeGuards.js';
import { E, Far } from '@endo/far';

const supportedChains = ['osmosis', 'cosmoshub'];
const { entries } = Object;

/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {PortfolioConfig} from './typeGuards.js'
 * @import {TimerService} from '@agoric/time';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   log: (msg: string) => Promise<void>;
 *   timerService: TimerService;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { log, makeStakeManagementKit, timerService },
  seat,
  offerArgs,
) => {
  console.log('Inside makeStakingPortfolio');
  mustMatch(offerArgs, PortfolioConfigShape);
  entries(offerArgs).length === 1 || Fail`only 1 remote currently supported`;
  const [[chainName, plan]] = entries(offerArgs);
  console.log({ chainName, plan });

  supportedChains.includes(chainName) || Fail`Unsupported chain: ${chainName}`;

  const handler = Far('handler', {
    async wake(timestamp) {
      console.log(
        'TODO: implement the logic for polling and staking',
        timestamp,
      );
    },
  });
  const repeaterP = E(timerService).makeRepeater(0n, 5n);
  void E(repeaterP).schedule(handler);

  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);

  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  console.log('Creating Remote account...');
  const remoteAccount = await remoteChain.makeAccount();
  console.log('Remote account created successfully');

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
