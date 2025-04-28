import React from 'react';
import { useAppStore } from '../state';

export const Tabs = () => {
  const { tab } = useAppStore((state) => ({
    tab: state.tab,
  }));

  return (
    <div className='tabs'>
      <button
        className={`tab-button ${tab === 1 ? 'active' : ''}`}
        onClick={() =>
          useAppStore.setState({
            tab: 1,
          })
        }>
        Make LCA
      </button>
    </div>
  );
};
