import React, { useEffect } from 'react';
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
import gituhbLogo from '/github.svg';
import WalletStatus from './components/WalletStatus';
import { useAppStore } from './state';
import { Tabs } from './components/Tabs';
import { MakePortfolio } from './components/MakePortfolio';
import { CurrentOffer } from './interfaces/interfaces';
import { StakeForm } from './components/StakeForm';

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
        contractInstance: instances.find(
          ([name]) => name === 'stakeManagement',
        )?.[1],
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

  watcher.watchLatest<CurrentOffer>(
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
        (invitation) => invitation[1].value[0].instance === contractInstance,
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
  const { wallet, loading, tab } = useAppStore((state) => ({
    wallet: state.wallet,
    loading: state.loading,
    error: state.error,
    tab: state.tab,
    currentOffers: state.currentOffers,
  }));

  useEffect(() => {
    setup(wallet?.address);
  }, [wallet]);

  const renderTabContent = () => {
    switch (tab) {
      case 1:
        return <MakePortfolio />;
      case 2:
        return <StakeForm />;
      default:
        return null;
    }
  };

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
    <div className="container">
      <div className="view-source">
        <a href="https://github.com/Agoric/agoric-sdk" target="_blank">
          <img src={gituhbLogo} className="github-logo" alt="Source Code" />
          Fork me on GitHub
        </a>
      </div>

      <ToastContainer
        aria-label
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

      <Logo />
      <div className="main-container">
        <Tabs />
        <div className="content">
          <WalletStatus address={wallet.address} />
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
