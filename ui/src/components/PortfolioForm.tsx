import React, { useState } from 'react';
import './PortfolioForm.css';
import { toast } from 'react-toastify';
import { TOAST_DURATION } from '../config';
import { useAppStore } from '../state';
import { showError } from '../Utils';

const chainOptions = ['Osmosis', 'Cosmos Hub'];

export default function PortfolioForm() {
  const [selectedChain, setSelectedChain] = useState('');
  const [settings, setSettings] = useState({});
  const { wallet, contractInstance, brands } = useAppStore.getState();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Submitted:', {
      selectedChain,
      settings,
    });

    let toastId: string | number | null = null;
    const brand = {
      brandKey: 'BLD',
      decimals: 6,
    };

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      const requiredBrand = brands[brand.brandKey];
      const amountValue = BigInt(8000);

      const give = {
        [brand.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      const offerArgs = {};
      offerArgs[selectedChain] = {
        freq: settings.restakeFrequency || settings.stakeFrequency,
      };
      const actions: string[] = [];

      if (settings.stake) {
        actions.push('stake');
      }
      if (settings.restake) {
        offerArgs[selectedChain] = {
          onRewards: ['restake'],
          ...offerArgs[selectedChain],
        };
      } else if (settings.stake) {
        offerArgs[selectedChain] = {
          onReceipt: ['stake'],
          ...offerArgs[selectedChain],
        };
      }

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          {
            source: 'contract',
            instance: contractInstance,
            publicInvitationMaker: 'makeStakingPortfolio',
          },
          { give },
          {},
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer was successful!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          },
        );
      });
    } catch (error) {
      showError({ content: error.message, duration: TOAST_DURATION.ERROR });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
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
          <option key={chain} value={chain.toLowerCase()}>
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
