/**
 * @import {Brand} from '@agoric/ertp';
 * @import {Denom} from '@agoric/orchestration';
 */

const osmosisData = {
  channelId: 'channel-10170',
  clientId: '07-tendermint-4441',
  connectionId: 'connection-3881',
  chainId: 'osmosis-1',
};

const agoricData = {
  channelId: 'channel-0',
  clientId: '07-tendermint-0',
  connectionId: 'connection-0',
  chainId: 'agoriclocal',
};

export const chainInfo = JSON.stringify({
  agoric: {
    bech32Prefix: 'agoric',
    chainId: agoricData.chainId,
    icqEnabled: false,
    namespace: 'cosmos',
    reference: agoricData.chainId,
    stakingTokens: [{ denom: 'ubld' }],
    connections: {
      [osmosisData.chainId]: {
        id: agoricData.connectionId,
        client_id: agoricData.clientId,
        counterparty: {
          client_id: osmosisData.clientId,
          connection_id: osmosisData.connectionId,
        },
        state: 3,
        transferChannel: {
          channelId: agoricData.channelId,
          portId: 'transfer',
          counterPartyChannelId: osmosisData.channelId,
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  osmosis: {
    bech32Prefix: 'osmo',
    chainId: osmosisData.chainId,
    icqEnabled: true,
    namespace: 'cosmos',
    reference: osmosisData.chainId,
    stakingTokens: [{ denom: 'uosmo' }],
    connections: {
      [agoricData.chainId]: {
        id: osmosisData.connectionId,
        client_id: osmosisData.clientId,
        counterparty: {
          client_id: agoricData.clientId,
          connection_id: agoricData.connectionId,
        },
        state: 3,
        transferChannel: {
          channelId: osmosisData.channelId,
          portId: 'transfer',
          counterPartyChannelId: agoricData.channelId,
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
});

/**
 * @typedef {object} DenomDetail
 * @property {string} baseName - name of issuing chain; e.g. cosmoshub
 * @property {Denom} baseDenom - e.g. uatom
 * @property {string} chainName - name of holding chain; e.g. agoric
 * @property {Brand<'nat'>} [brand] - vbank brand, if registered
 * @see {ChainHub} `registerAsset` method
 */

export const assetInfo = JSON.stringify([
  [
    'uist',
    {
      baseDenom: 'uist',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'ubld',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'uosmo',
    {
      baseDenom: 'uosmo',
      baseName: 'osmosis',
      chainName: 'osmosis',
    },
  ],
]);
