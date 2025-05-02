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
  },
  emerynet: {
    label: 'Agoric Emerynet',
    url: 'https://emerynet.agoric.net/network-config',
  },
  localhost: {
    label: 'Local Network',
    url: 'https://local.agoric.net/network-config',
  },
};
