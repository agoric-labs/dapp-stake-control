import React, { useState } from 'react';
import './PortfolioForm.css';

const chainOptions = ['Osmosis', 'Cosmos Hub'];

export default function PortfolioForm() {
  const [selectedChain, setSelectedChain] = useState('');
  const [settings, setSettings] = useState({});

  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setFrequency = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [`${key}Frequency`]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted:', {
      selectedChain,
      settings,
    });
  };

  return (
    <form className="dark-form-container" onSubmit={handleSubmit}>
      <h2 className="dark-title">Make Portfolio</h2>

      <select
        className="dark-dropdown"
        value={selectedChain}
        onChange={(e) => setSelectedChain(e.target.value)}
      >
        <option value="">Select Chain</option>
        {chainOptions.map((chain) => (
          <option key={chain} value={chain}>
            {chain}
          </option>
        ))}
      </select>

      {selectedChain && (
        <div className="dark-card">
          <h3>{selectedChain} Options</h3>

          <div className="setting-row">
            <label>Stake when tokens arrive:</label>
            <input
              type="checkbox"
              checked={settings.stake || false}
              onChange={() => toggleSetting('stake')}
            />
          </div>
          <div className="button-group">
            <button
              type="button"
              disabled={!settings.stake}
              className={settings.stakeFrequency === 'daily' ? 'active' : ''}
              onClick={() => setFrequency('stake', 'daily')}
            >
              Daily
            </button>
            <button
              type="button"
              disabled={!settings.stake}
              className={settings.stakeFrequency === 'weekly' ? 'active' : ''}
              onClick={() => setFrequency('stake', 'weekly')}
            >
              Weekly
            </button>
          </div>

          <div className="setting-row">
            <label>Restake when rewards accrue:</label>
            <input
              type="checkbox"
              checked={settings.restake || false}
              onChange={() => toggleSetting('restake')}
            />
          </div>
          <div className="button-group">
            <button
              type="button"
              disabled={!settings.restake}
              className={settings.restakeFrequency === 'daily' ? 'active' : ''}
              onClick={() => setFrequency('restake', 'daily')}
            >
              Daily
            </button>
            <button
              type="button"
              disabled={!settings.restake}
              className={settings.restakeFrequency === 'weekly' ? 'active' : ''}
              onClick={() => setFrequency('restake', 'weekly')}
            >
              Weekly
            </button>
          </div>
        </div>
      )}

      {selectedChain && (
        <div className="submit-wrapper">
          <button type="submit" className="submit-button">
            Submit
          </button>
        </div>
      )}
    </form>
  );
}
