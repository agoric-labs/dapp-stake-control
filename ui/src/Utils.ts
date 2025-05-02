import { toast } from 'react-toastify';
import {
  suggestChain,
  makeAgoricWalletConnection,
} from '@agoric/web-components';
import { networkConfigs } from './config';
import { useAppStore } from './state';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import {
  AgoricChainStoragePathKind as Kind,
  makeAgoricChainStorageWatcher,
} from '@agoric/rpc';
import { ToastMessageOptions } from 'interfaces/interfaces.js';

export const showSuccess = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.success(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showError = ({ content, duration }: ToastMessageOptions): void => {
  toast.error(content, {
    position: 'top-right',
    // autoClose: duration,
  });
};

export const showWarning = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.warn(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const wait = async (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const connectWallet = async () => {
  const { network, watcher } = useAppStore.getState();
  if (!watcher) {
    throw Error('watcher is not defined');
  }
  const { url, rpc } = networkConfigs[network];
  await suggestChain(url);
  const wallet = await makeAgoricWalletConnection(watcher, rpc);
  useAppStore.setState({ wallet });
};

export const createWatcherHandlers = (
  watcher: ReturnType<typeof makeAgoricChainStorageWatcher>,
  walletAddress: string | undefined,
) => {
  return {
    watchInstances: () => {
      watcher.watchLatest<Array<[string, unknown]>>(
        [Kind.Data, 'published.agoricNames.instance'],
        (instances) => {
          console.log('got instances', instances);
          useAppStore.setState({
            contractInstance: instances.find(([name]) => name === 'StkC')?.[1],
          });
        },
      );
    },

    watchBrands: () => {
      watcher.watchLatest<Array<[string, unknown]>>(
        [Kind.Data, 'published.agoricNames.brand'],
        (brands) => {
          console.log('Got brands', brands);
          useAppStore.setState({
            brands: Object.fromEntries(brands),
          });
        },
      );
    },

    watchWallet: () => {
      if (!walletAddress) return;

      watcher.watchLatest<CurrentWalletRecord>(
        [Kind.Data, `published.wallet.${walletAddress}.current`],
        (co) => {
          const currentOffer = co || null;
          if (!currentOffer) return;

          useAppStore.setState({ currentOffers: currentOffer });

          if (!currentOffer.offerToUsedInvitation) return;

          const { contractInstance } = useAppStore.getState();

          const invitations = currentOffer.offerToUsedInvitation.filter(
            ([, details]) =>
              Array.isArray(details.value) &&
              details.value[0] === contractInstance,
          );

          const sorted = invitations.sort((a, b) => b[0].localeCompare(a[0]));
          useAppStore.setState({ latestInvitation: sorted[0][0] });
        },
      );
    },
  };
};

export const setupWatcher = ({
  api,
  chainId,
}: {
  api: string;
  chainId: string;
}) => {
  useAppStore.setState({
    watcher: makeAgoricChainStorageWatcher(api, chainId),
  });
};
