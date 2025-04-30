import React from 'react';
import agoricLogo from '/agoric.svg';

const Logo = () => (
  <div className="logo-container">
    <h1 className="title">Stake Management</h1>
    <a href="https://agoric.com/develop" target="_blank">
      <img src={agoricLogo} className="agoric-logo" alt="Agoric logo" />
    </a>
  </div>
);

export default Logo;
