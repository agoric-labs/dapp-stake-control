import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { useAppStore } from './state';
import { ContentContainer } from './components/ContentContainer';
import { TopBar } from './components/Topbar';

const App = () => {
  useAppStore((state) => ({
    wallet: state.wallet,
    loading: state.loading,
    error: state.error,
    tab: state.tab,
    currentOffers: state.currentOffers,
    network: state.network,
    isNetworkChanging: state.isNetworkChanging,
    watcher: state.watcher,
  }));

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
};

export default App;
