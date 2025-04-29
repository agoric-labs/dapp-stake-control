import React from 'react';
import { useAppStore } from '../state';

export const Tabs = () => {
  const { tab } = useAppStore((state) => ({
    tab: state.tab,
  }));

  return (
    <div className="tabs">
      <button
        className={`tab-button ${tab === 1 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            tab: 1,
          })
        }
      >
        Make LCA
      </button>
      <button
        className={`tab-button ${tab === 2 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            tab: 2,
          })
        }
      >
        Fund
      </button>
      <button
        className={`tab-button ${tab === 3 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            tab: 3,
          })
        }
      >
        Stake
      </button>
    </div>
  );
};
