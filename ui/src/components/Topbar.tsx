import Logo from './Logo';
import './Topbar.css';

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
      <h1 className="title">Stake Control</h1>
      <Logo />
    </div>
  );
};
