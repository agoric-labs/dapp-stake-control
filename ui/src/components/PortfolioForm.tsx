import { useState, useEffect } from 'react';
import './PortfolioForm.css';
import { toast } from 'react-toastify';
import { TOAST_DURATION } from '../config';
import { useAppStore } from '../state';
import { showError } from '../Utils';
import { chainOptions, SupportedChain } from '../interfaces/interfaces';
import { type OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type {
  PortfolioConfig,
  PollingFrequency,
  ReceiptAction,
  RewardsAction,
  RemoteConfig,
} from 'staking-contract';

export default function PortfolioForm() {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | ''>('');
  const [portfolioConfig, setPortfolioConfig] = useState<PortfolioConfig>({});

  const { wallet, contractInstance, brands } = useAppStore.getState();

  // Initialize state from URL params on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const chainParam = searchParams.get('chain') as SupportedChain | null;
    const validChains = chainOptions.map((c) => c.toLowerCase());

    if (chainParam && validChains.includes(chainParam)) {
      const freq = (searchParams.get('freq') as PollingFrequency) || '';

      const onReceipt = searchParams.has('onReceipt')
        ? (['stake'] as ReceiptAction[])
        : [];
      const onRewards = searchParams.has('onRewards')
        ? (['restake'] as RewardsAction[])
        : [];

      setSelectedChain(chainParam);
      setPortfolioConfig({
        [chainParam]: {
          freq,
          onReceipt,
          onRewards,
        },
      });
    }
  }, []);

  const updatePortfolioConfig = (chainName: string, changes: RemoteConfig) => {
    setPortfolioConfig((prev: PortfolioConfig) => ({
      [chainName]: {
        ...prev[chainName],
        ...changes,
      },
    }));
  };

  const updateUrlParams = (params: Record<string, any>) => {
    const url = new URL(window.location.href);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });

    history.replaceState(null, '', url.href);
  };

  const handleFrequency = (newFreq: PollingFrequency) => {
    if (!selectedChain) {
      showError({ content: 'Please select a chain' });
      return;
    }
    updatePortfolioConfig(selectedChain, { freq: newFreq });
    updateUrlParams({ freq: newFreq });
  };

  const handleToggle = (
    key: Exclude<keyof RemoteConfig, 'freq'>,
    value: string,
  ) => {
    if (!selectedChain) {
      showError({ content: 'Please select a chain' });
      return;
    }

    const currentValues = config[key] ?? [];
    const isToggledOn = currentValues.length > 0;
    const newValue = isToggledOn ? [] : [value];

    updatePortfolioConfig(selectedChain, {
      [key]: newValue,
    });

    // Passing null removes the key from URL Params
    updateUrlParams({ [key]: newValue.length > 0 ? newValue : null });
  };

  const handleChainUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chain = e.target.value as SupportedChain;
    setSelectedChain(chain);

    updateUrlParams({ chain, freq: null, onRewards: null, onReceipt: null });
    setPortfolioConfig({
      [chain]: { freq: undefined, onReceipt: [], onRewards: [] },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const config = portfolioConfig[selectedChain];
    if (!config) return;

    console.log('Form Submitted:', portfolioConfig);

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

      // TODO: get custom terms from vstorage
      const give = {
        Fee: { brand: requiredBrand, value: 12n * 1000_000n },
        Retainer: { brand: requiredBrand, value: 50n * 1000_000n },
      };

      const offerArgs: PortfolioConfig = {
        [selectedChain]: config,
      };

      console.log(offerArgs);

      const offer: Omit<OfferSpec, 'id'> = {
        invitationSpec: {
          source: 'contract',
          instance: contractInstance,
          publicInvitationMaker: 'makeStakingPortfolio',
        },
        // @ts-expect-error
        proposal: { give },
        offerArgs,
      };

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          offer.invitationSpec,
          offer.proposal,
          offer.offerArgs,
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
      showError({
        content: error instanceof Error ? error.message : String(error),
        duration: TOAST_DURATION.ERROR,
      });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
  };

  const config = portfolioConfig[selectedChain] || {};

  return (
    <form className="dark-form-container" onSubmit={handleSubmit}>
      <h2 className="dark-title">Make Portfolio</h2>

      <select
        className="dark-dropdown"
        value={selectedChain}
        onChange={handleChainUpdate}
      >
        <option value="">Select Chain</option>
        {chainOptions.map((chain) => (
          <option key={chain} value={chain.toLowerCase()}>
            {chain}
          </option>
        ))}
      </select>

      <div className="dark-card">
        <div className="setting-row">
          <label>Polling Frequency:</label>
        </div>
        <div className="button-group">
          <button
            type="button"
            className={config.freq === 'daily' ? 'active' : ''}
            onClick={() => handleFrequency('daily')}
          >
            Daily
          </button>
          <button
            type="button"
            className={config.freq === 'weekly' ? 'active' : ''}
            onClick={() => handleFrequency('weekly')}
          >
            Weekly
          </button>
        </div>

        <label className="setting-row">
          <p>Stake when tokens arrive:</p>
          <input
            type="checkbox"
            checked={!!config.onReceipt?.length}
            onClick={() => handleToggle('onReceipt', 'stake')}
          />
        </label>

        <label className="setting-row">
          <p>Restake when rewards accrue:</p>
          <input
            type="checkbox"
            checked={!!config.onRewards?.length}
            onClick={() => handleToggle('onRewards', 'restake')}
          />
        </label>
      </div>

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
