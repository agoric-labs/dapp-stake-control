import React, { useState } from 'react';
import { useAppStore } from '../state.js';

export const StakeForm = () => {
  const { loading } = useAppStore.getState();
  const [amount, setAmount] = useState(0);
  const [validatorAddress, setValidatorAddress] = useState('');

  const handleAmountToSend = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  const handleValidatorAddress = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidatorAddress(e.target.value);
  };

  const makeOffer = async () => {
    console.log('TBD');
  };

  return (
    <form className="dark-form-container" id="stake-form">
      <h2 className="dark-title">Stake Tokens</h2>

      <div className="form-group">
        <label className="input-label">Validator Address:</label>
        <div className="form-group-validator-address">
          <input
            className="input-field"
            value={validatorAddress}
            onChange={handleValidatorAddress}
            placeholder="osmo1..."
          />
        </div>
      </div>

      <div className="form-group">
        <label className="input-label">Amount:</label>
        <input
          className="input-field"
          type="number"
          value={amount}
          onChange={handleAmountToSend}
          placeholder="0.00"
          min="0"
          step="0.1"
        />
      </div>

      <button
        className="stake-button"
        onClick={makeOffer}
        disabled={loading || !amount || !validatorAddress}
      >
        {loading ? 'Processing...' : 'Stake'}
      </button>
    </form>
  );
};
