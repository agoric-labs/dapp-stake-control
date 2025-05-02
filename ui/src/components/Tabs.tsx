import { useAppStore } from '../state';
import './Tabs.css';

export const Tabs = () => {
  const { tab } = useAppStore((state) => ({ tab: state.tab }));

  const handleTabClick = (tabNumber: number) => {
    useAppStore.setState({ tab: tabNumber });
  };

  const tabs = [
    { label: 'Create Portfolio', number: 1 },
    { label: 'Stake', number: 2 },
  ];

  return (
    <div className="tabs">
      {tabs.map(({ label, number }) => (
        <button
          key={number}
          className={`tab-button ${tab === number ? 'active' : ''}`}
          onClick={() => handleTabClick(number)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
