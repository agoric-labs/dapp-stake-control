import React from 'react';
import Logo from './Logo';
import gituhbLogo from '/github.svg';
import './Topbar.css';

export const TopBar = () => {
  return (
    <div className="topbar">
      <div className="view-source">
        <a
          href="https://github.com/agoric-labs/dapp-stake-control"
          target="_blank"
        >
          <img src={gituhbLogo} className="github-logo" alt="Source Code" />
          Fork me on GitHub
        </a>
      </div>
      <h1 className="title">Stake Control</h1>
      <Logo />
    </div>
  );
};
