const osmosisData = {
  channelId: 'channel-10170',
  clientId: '07-tendermint-4441',
  connectionId: 'connection-3881',
};

const agoricData = {
  channelId: 'channel-0',
  clientId: '07-tendermint-0',
  connectionId: 'connection-0',
};

export const chainInfo = JSON.stringify({
  agoric: {
    chainId: 'agoriclocal',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
    connections: {
      'osmo-test-5': {
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
    chainId: 'osmo-test-5',
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    connections: {
      agoriclocal: {
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
