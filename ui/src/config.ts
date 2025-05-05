export const urls = {
  RPC_AGORIC_DEVNET: 'https://devnet.rpc.agoric.net/',
  RPC_AGORIC_XNET: 'https://xnet.rpc.agoric.net/',
  RPC_OSMOSIS: 'https://rpc.osmotest5.osmosis.zone',
};

export const TOAST_DURATION = {
  ERROR: 3000,
  SUCCESS: 4000,
} as const;

export const networkConfigs = {
  devnet: {
    label: 'Agoric Devnet',
    url: 'https://devnet.agoric.net/network-config',
    rpc: 'https://devnet.rpc.agoric.net',
    api: 'https://devnet.api.agoric.net',
    chainId: 'agoricdev-25',
  },
  emerynet: {
    label: 'Agoric Emerynet',
    url: 'https://emerynet.agoric.net/network-config',
    rpc: 'https://emerynet.rpc.agoric.net',
    api: 'https://emerynet.api.agoric.net',
    chainId: 'agoric-emerynet-9',
  },
  localhost: {
    label: 'Local Network',
    url: 'https://local.agoric.net/network-config',
    rpc: 'http://localhost:26657',
    api: 'http://localhost:1317',
    chainId: 'agoriclocal',
  },
  'axelar-local': {
    label: 'Axelar Local Network',
    url: 'https://local.agoric.net/network-config',
    api: 'http://localhost/agoric-lcd',
    rpc: 'http://localhost/agoric-rpc',
    chainId: 'agoriclocal',
  },
};

export type Network = keyof typeof networkConfigs;
