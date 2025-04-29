import React from 'react';
import agoricLogo from '/agoric.svg';

const Logo = () => (
  <div className="logo-container">
    <a href="https://agoric.com/develop" target="_blank">
      <img src={agoricLogo} className="agoric-logo" alt="Agoric logo" />
    </a>
  </div>
);

export default Logo;
