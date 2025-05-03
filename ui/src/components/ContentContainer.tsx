import PortfolioForm from './PortfolioForm';
import { StakeForm } from './StakeForm';
import { Tabs } from './Tabs';
import WalletStatus from './WalletStatus';
import { useAppStore } from '../state';
import './ContentContainer.css';

export const ContentContainer = () => {
  const { tab } = useAppStore.getState();

  const renderTabContent = () => {
    switch (tab) {
      case 1:
        return <PortfolioForm />;
      case 2:
        return <StakeForm />;
      default:
        return null;
    }
  };
  return (
    <div className="main-container">
      <Tabs />
      <div className="content">
        <WalletStatus />
        {renderTabContent()}
      </div>
    </div>
  );
};
