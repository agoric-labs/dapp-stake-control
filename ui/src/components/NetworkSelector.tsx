import React, { useState } from 'react';
import './NetworkSelector.css';

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

const NetworkSelector = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('localhost');

  const handleNetworkChange = (e) => {
    setSelectedNetwork(e.target.value);
  };

  return (
    <div className="network-select-container">
      <select
        className="network-select"
        value={selectedNetwork}
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
