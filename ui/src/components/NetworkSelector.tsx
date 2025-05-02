import { useEffect } from 'react';
import './NetworkSelector.css';
import { networkConfigs } from '../config';
import { useAppStore } from '../state';
import { connectWallet, createWatcherHandlers, setupWatcher } from '../Utils';

const NetworkSelector = () => {
  const { network, watcher, wallet } = useAppStore.getState();
  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    useAppStore.setState({
      network: e.target.value as 'localhost' | 'devnet' | 'emerynet',
    });
  };

  useEffect(() => {
    const setupNetwork = async () => {
      const { api, chainId } = networkConfigs[network];
      setupWatcher({ api, chainId });
      await connectWallet();
    };

    setupNetwork();
  }, [network]);

  useEffect(() => {
    if (watcher) {
      const handlers = createWatcherHandlers(watcher, wallet?.address);
      handlers.watchInstances();
      handlers.watchBrands();
      handlers.watchWallet();
    }
  }, [wallet]);

  return (
    <div className="network-select-container">
      <select
        className="network-select"
        value={network}
        onChange={handleNetworkChange}
      >
        {Object.entries(networkConfigs).map(([key, { label }]) => (
          <option key={key} value={key}>
            {label.replace('Agoric ', '')}
          </option>
        ))}
      </select>
    </div>
  );
};

export default NetworkSelector;
