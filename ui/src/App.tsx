import { useEffect } from 'react';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Logo from './components/Logo';
import { useAppStore } from './state';
import { ContentContainer } from './components/ContentContainer';
import { TopBar } from './components/Topbar';
import { connectWallet, setupWatcher } from './Utils';
import { networkConfigs } from './config';

function App() {
  const { wallet, loading, network } = useAppStore((state) => ({
    wallet: state.wallet,
    loading: state.loading,
    error: state.error,
    tab: state.tab,
    currentOffers: state.currentOffers,
    network: state.network,
    isNetworkChanging: state.isNetworkChanging,
    watcher: state.watcher,
  }));

  useEffect(() => {
    const { api, chainId } = networkConfigs[network];
    setupWatcher({ api, chainId });
  }, []);

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
