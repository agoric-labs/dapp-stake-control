// @ts-check
import { Fail } from '@endo/errors';

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
 */
export const createAndMonitorLCA = async (
  orch,
  { log, makeStakeManagementKit },
  seat,
) => {
  void log('Inside createAndMonitorLCA');
  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain('osmosis'),
  ]);
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  const osmoAccount = await remoteChain.makeAccount();
  void log('Osmo account created successfully');
  const osmoChainAddress = await osmoAccount.getAddress();
  console.log('Osmo Chain Address:', osmoChainAddress);

  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();

  const stakeManagementKit = makeStakeManagementKit({
    osmoAccount,
    osmoChainAddress,
    assets,
    remoteChainInfo: info,
  });

  seat.exit();
  void log('Done');
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(createAndMonitorLCA);
