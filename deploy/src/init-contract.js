/**
 * @file build core eval script to deploy stake-control contract
 *
 * Usage:
 *   agoric run init-contract.js
 * or
 *   agoric run init-contract.js --net emerynet \
 *     --peer osmosis:connection-128:channel-115:uosmo
 *
 * where connection-128 is a connection to a chain with bech32 prefix osmosis,
 * with channel-115 for transfer and staking token denom uosmo.
 */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import {
  CosmosChainInfoShape,
  DenomDetailShape,
  DenomShape,
  IBCConnectionInfoShape,
} from '@agoric/orchestration/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { makeAgd } from '../tools/agd-lib.js';
import * as staticConfig from './info.js';
import { getManifest, startStakeManagement } from './start-contract.js';
import { fetchValidators } from './fetch-validators.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {IBCChannelID, IBCConnectionID} from '@agoric/vats';
 */

/** @type {import('node:util').ParseArgsConfig['options']} */
const options = {
  net: { type: 'string' },
  peer: { type: 'string', multiple: true },
};
/** @typedef {{ net?: string, peer?: string[] }} PeerChainOpts */

/** @satisfies {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: './start-contract.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install('../dist/stake.contract.bundle.js'),
        ),
        options,
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const { scriptArgs } = endowments;
  /** @type {{ values: PeerChainOpts }} */
  const { values: flags } = parseArgs({ args: scriptArgs, options });

  /** @param {string} net */
  const getNetConfig = (net) =>
    fetch(`https://${net}.agoric.net/network-config`)
      .then((res) => res.text())
      .then((s) => JSON.parse(s));

  /** @param {string[]} strs */
  const parsePeers = (strs) => {
    /** @type {[name: string, conn: IBCConnectionID, chan: IBCChannelID, denom:string][]} */
    // @ts-expect-error XXX ID syntax should be dynamically checked
    const peerParts = strs.map((s) => s.split(':'));
    const badPeers = peerParts.filter((d) => d.length !== 4);
    if (badPeers.length) {
      throw Error(
        `peers must be name:connection-X:channel-Y:denom, not ${badPeers.join(', ')}`,
      );
    }
    return peerParts;
  };

  /** @type {Record<string, CosmosChainInfo>} */
  const chainDetails = {};

  if (flags.net) {
    if (!flags.peer) throw Error('--peer required');
    /** @type {Record<string, IBCConnectionInfo>} */
    const connections = {};
    const portId = 'transfer';

    const { chainName: chainId, rpcAddrs } = await getNetConfig(flags.net);
    const agd = makeAgd({ execFileSync }).withOpts({ rpcAddrs });

    for (const [peerName, myConn, myChan, denom] of parsePeers(flags.peer)) {
      console.debug(peerName, { denom });
      const connInfo = await agd
        .query(['ibc', 'connection', 'end', myConn])
        .then((x) => x.connection);
      const { client_id } = connInfo;
      const clientState = await agd
        .query(['ibc', 'client', 'state', client_id])
        .then((x) => x.client_state);
      const { chain_id: peerId } = clientState;
      console.debug(peerName, { chainId: peerId, denom });
      chainDetails[peerName] = {
        namespace: 'cosmos',
        reference: peerId,
        chainId: peerId,
        stakingTokens: [{ denom }],
        bech32Prefix: peerName,
      };

      const chan = await agd
        .query(['ibc', 'channel', 'end', portId, myChan])
        .then((r) => r.channel);

      /** @type {IBCConnectionInfo} */
      const info = harden({
        client_id,
        counterparty: {
          client_id: connInfo.counterparty.client_id,
          connection_id: connInfo.counterparty.connection_id,
        },
        id: myConn,
        state: connInfo.state,
        transferChannel: {
          channelId: myChan,
          counterPartyChannelId: chan.counterparty.channel_id,
          counterPartyPortId: chan.counterparty.port_id,
          ordering: chan.ordering,
          portId,
          state: chan.state,
          version: chan.version,
        },
      });
      mustMatch(info, IBCConnectionInfoShape);
      connections[peerId] = info;
    }

    chainDetails['agoric'] = {
      namespace: 'cosmos',
      reference: chainId,
      chainId,
      stakingTokens: [{ denom: 'ubld' }],
      connections,
      bech32Prefix: 'agoric',
    };
  } else {
    Object.assign(chainDetails, JSON.parse(staticConfig.chainInfo));
  }
  mustMatch(harden(chainDetails), M.recordOf(M.string(), CosmosChainInfoShape));
  const assetInfo = JSON.parse(staticConfig.assetInfo);
  mustMatch(harden(assetInfo), M.arrayOf([DenomShape, DenomDetailShape]));
  const validators = await fetchValidators();
  await writeCoreEval(startStakeManagement.name, (opts) =>
    defaultProposalBuilder(opts, {
      chainInfo: chainDetails,
      assetInfo,
      validators,
    }),
  );
};
