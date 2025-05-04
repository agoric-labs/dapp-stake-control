import Logo from './Logo';
import './Topbar.css';
import NetworkSelector from './NetworkSelector';
import { ConnectionModal } from './ConnectionModal.js';

export const TopBar = () => {
  return (
    <div className="topbar">
      <div className="view-source">
        <a
          href="https://github.com/agoric-labs/dapp-stake-control"
          target="_blank"
        >
          <img
            src={`${import.meta.env.BASE_URL}github.svg`}
            className="github-logo"
            alt="Source Code"
          />
          Fork me on GitHub
        </a>
      </div>
      <div className="title-container">
        <Logo height="80px" width="90px" />
        <h1 className="title">Stake Control</h1>
      </div>
      <ConnectionModal />
    </div>
  );
};
