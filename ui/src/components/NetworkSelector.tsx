import React, { useState } from 'react';
import './NetworkSelector.css';
import { networkConfigs } from '../config.ts';
import { useAppStore } from '../state.ts';

const NetworkSelector = () => {
  const { network } = useAppStore.getState();
  const handleNetworkChange = (e) => {
    useAppStore.setState({ network: e.target.value });
  };

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
