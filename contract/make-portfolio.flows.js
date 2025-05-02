// @ts-check
import { mustMatch, makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { PortfolioConfigShape, PUBLIC_TOPICS } from './typeGuards.js';

const trace = makeTracer('StkC');
const supportedChains = ['osmosis', 'cosmoshub'];
const { entries } = Object;

/**
 * @import {Orchestrator, OrchestrationFlow} from '@agoric/orchestration';
 * @import {PublicSubscribers} from '@agoric/smart-wallet/src/types.js';
 * @import { ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {MakeStakeManagementKit} from './staking-kit.js';
 * @import {PortfolioConfig} from './typeGuards.js'
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {{
 *   poll: any
 *   makeStakeManagementKit: MakeStakeManagementKit;
 *   makeStorageNode: (id: bigint) => Promise<StorageNode>;
 *   log: (msg: string) => Promise<void>;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {PortfolioConfig} offerArgs
 */
export const makeStakingPortfolio = async (
  orch,
  { poll, makeStakeManagementKit, makeStorageNode },
  seat,
  offerArgs,
) => {
  trace('Inside makeStakingPortfolio');
  mustMatch(offerArgs, PortfolioConfigShape);
  entries(offerArgs).length === 1 || Fail`only 1 remote currently supported`;
  const [[chainName, plan]] = entries(offerArgs);
  trace({ chainName, plan });

  supportedChains.includes(chainName) || Fail`Unsupported chain: ${chainName}`;

  // poll();

  const [agoric, remoteChain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);

  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom || Fail`${chainId} does not have stakingTokens in config`;

  trace('Creating Remote account...');
  const remoteAccount = await remoteChain.makeAccount();
  trace('Remote account created successfully');

  const remoteChainAddress = await remoteAccount.getAddress();
  trace('Remote Chain Address:', remoteChainAddress);

  const assets = await agoric.getVBankAssetInfo();
  const info = await remoteChain.getChainInfo();

  const id = 123n; // TODO
  const storageNode = await makeStorageNode(id);

  const stakeManagementKit = makeStakeManagementKit(
    {
      remoteAccount,
      remoteChainAddress,
      assets,
      remoteChainInfo: info,
      stakePlan: plan,
    },
    storageNode,
  );

  seat.exit();
  const topicKit = /** @type { any } */ (null);
  const result = harden({
    invitationMakers: stakeManagementKit.invitationMakers,
    /** @type {PublicSubscribers} */
    publicSubscribers: {
      portfolio: {
        description: PUBLIC_TOPICS.portfolio[0],
        subscriber: topicKit.subscriber,
        storagePath: topicKit.recorder.getStoragePath(),
      },
    },
  });
  return result;
};
harden(makeStakingPortfolio);
