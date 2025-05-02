import { useEffect } from 'react';
import './App.css';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import {
  makeAgoricWalletConnection,
  suggestChain,
} from '@agoric/web-components';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Logo from './components/Logo';
import { useAppStore } from './state';
import { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import { ContentContainer } from './components/ContentContainer';
import { TopBar } from './components/Topbar';

const ENDPOINTS = {
  RPC: 'http://localhost:26657',
  API: 'http://localhost:1317',
};

const watcher = makeAgoricChainStorageWatcher(ENDPOINTS.API, 'agoriclocal');

const setup = async (walletAddress: string | undefined) => {
  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.instance'],
    (instances) => {
      console.log('got instances', instances);
      useAppStore.setState({
        contractInstance: instances.find(([name]) => name === 'StkC')?.[1],
      });
    },
  );

  const { fromEntries } = Object;

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, 'published.agoricNames.brand'],
    (brands) => {
      console.log('Got brands', brands);
      useAppStore.setState({
        brands: fromEntries(brands),
      });
    },
  );

  watcher.watchLatest<CurrentWalletRecord>(
    [Kind.Data, `published.wallet.${walletAddress}.current`],
    (co) => {
      const currentOffer = co ? co : null;
      if (!currentOffer) {
        return;
      }

      useAppStore.setState({
        currentOffers: currentOffer,
      });

      if (!currentOffer?.offerToUsedInvitation) {
        return;
      }

      const { contractInstance } = useAppStore.getState();

      const invitations = currentOffer.offerToUsedInvitation.filter(
        (invitation) => {
          const value = invitation[1]?.value;
          if (Array.isArray(value)) {
            return value[0] === contractInstance;
          }
          return false;
        },
      );

      const sorted = invitations.sort((a, b) => b[0].localeCompare(a[0]));
      useAppStore.setState({
        latestInvitation: sorted[0][0],
      });
    },
  );
};

const connectWallet = async () => {
  await suggestChain('https://local.agoric.net/network-config');
  const wallet = await makeAgoricWalletConnection(watcher, ENDPOINTS.RPC);
  useAppStore.setState({ wallet });
};

function App() {
  const { wallet, loading } = useAppStore((state) => ({
    wallet: state.wallet,
    loading: state.loading,
    error: state.error,
    tab: state.tab,
    currentOffers: state.currentOffers,
  }));

  useEffect(() => {
    setup(wallet?.address);
  }, [wallet]);

  if (!wallet) {
    return (
      <>
        <Logo />
        <button
          className="connect-button"
          onClick={connectWallet}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container">
        <ToastContainer
          position="bottom-right"
          hideProgressBar={false}
          newestOnTop={false}
          closeButton={false}
          closeOnClick
          autoClose={5000}
          rtl={false}
          pauseOnFocusLoss
          pauseOnHover
          theme="colored"
        ></ToastContainer>

        <ContentContainer />
      </div>
    </>
  );
}

export default App;
