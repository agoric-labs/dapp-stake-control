// @ts-check
import { Fail } from '@endo/errors';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import {MakePortfolioHolder} from '@agoric/orchestration/src/exos/portfolio-holder-kit.js';
 * @import {ChainHub} from '@agoric/orchestration/src/exos/chain-hub.js';
 * @import {Vow} from '@agoric/vow';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   makePortfolioHolder: MakePortfolioHolder;
 *   chainHub: GuestInterface<ChainHub>;
 *   log: GuestOf<(msg: string) => Vow<void>>;
 *   zoeTools: ZoeTools;
 * }} ctx
 * @param {ZCFSeat} seat
 */
export const createAndMonitorLCA = async (
  orch,
  { log, makeStakeManagementKit, zoeTools },
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

  const localAccount = await agoric.makeAccount();
  void log('localAccount created successfully');
  const localChainAddress = await localAccount.getAddress();
  console.log('Local Chain Address:', localChainAddress);

  const osmoAccount = await remoteChain.makeAccount();
  void log('Osmo account created successfully');
  const osmoChainAddress = await osmoAccount.getAddress();
  console.log('Osmo Chain Address:', osmoChainAddress);

  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();

  const stakeManagementKit = makeStakeManagementKit({
    localAccount,
    localChainAddress,
    osmoAccount,
    osmoChainAddress,
    assets,
    remoteChainInfo: info,
  });

  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(stakeManagementKit.tap);
  void log('Monitoring transfers setup successfully');

  const { give } = seat.getProposal();
  await zoeTools.localTransfer(seat, localAccount, give);
  seat.exit();
  void log('Done');
  return harden({ invitationMakers: stakeManagementKit.invitationMakers });
};
harden(createAndMonitorLCA);
