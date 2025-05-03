import { useState } from 'react';
import './ConnectionModal.css';
import { useAppStore } from '../state.js';
import {
  connectWallet,
  createWatcherHandlers,
  setupWatcher,
  showSuccess,
} from '../Utils.js';
import { Network, networkConfigs } from '../config.js';

export const ConnectionModal = () => {
  const { network, watcher, wallet } = useAppStore.getState();
  const [showModal, setShowModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(network);

  const setCurrentNetwork = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetwork(e.target.value as Network);
  };

  const connect = async () => {
    try {
      useAppStore.setState({ network: selectedNetwork });
      const { api, chainId } = networkConfigs[selectedNetwork];

      // create a watcher instance for selectedNetwork
      setupWatcher({ api, chainId });
      if (!watcher) throw Error('Watcher is not defined');

      // connect wallet using the selectedNetwork
      await connectWallet();

      // setup hanlders to watch instances and brands
      const handlers = createWatcherHandlers(watcher, wallet?.address);
      handlers.watchInstances();
      handlers.watchBrands();
      setShowModal(false);
      showSuccess({ content: 'Wallet Connected', duration: 1000 });
    } catch (err) {
      console.error(err);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  return (
    <>
      <button className="connect-wallet-btn" onClick={() => setShowModal(true)}>
        Connect Wallet
      </button>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Connection Settings</h2>
            <div className="modal-group">
              <select
                className="network-select"
                value={selectedNetwork}
                onChange={setCurrentNetwork}
              >
                {Object.entries(networkConfigs).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label.replace('Agoric ', '')}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="connect-btn" onClick={connect}>
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
