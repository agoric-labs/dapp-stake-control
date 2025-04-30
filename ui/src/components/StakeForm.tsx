import { type OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { MakeStakeManagementKit } from '../../../contract/staking-kit.js';
import { TOAST_DURATION } from '../config';
import { useAppStore } from '../state';
import { showError, showSuccess } from '../Utils';

export const StakeForm = () => {
  const { wallet, loading, contractInstance, brands, latestInvitation } =
    useAppStore.getState();
  const [amount, setAmount] = useState(0);
  const [validatorAddress, setValidatorAddress] = useState('');

  const handleAmountToSend = (e) => {
    setAmount(Number(e.target.value));
  };

  const handleValidatorAddress = (e) => {
    setValidatorAddress(e.target.value);
  };

  const makeOffer = async () => {
    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      const BLD = {
        brandKey: 'BLD',
        decimals: 6,
      };

      const requiredBrand = brands[BLD.brandKey];
      const amountValue = BigInt(8000);

      const give = {
        [BLD.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      const invitationMakerName: keyof ReturnType<MakeStakeManagementKit>['invitationMakers'] =
        'makeStakeManagementInvitation';
      const args: OfferSpec = {
        id: Date.now(),
        invitationSpec: {
          source: 'continuing',
          previousOffer: latestInvitation,
          invitationMakerName,
          invitationArgs: harden([
            // XXX TODO: types for method, args
            'stakeOsmo',
            [
              {
                validatorAddress,
                stakeAmount: amount,
              },
            ],
          ]),
        },
        offerArgs: {},
        proposal: { give },
      };

      await new Promise<void>((resolve, reject) => {
        wallet.makeOffer(
          args.invitationSpec,
          args.proposal,
          args.offerArgs,
          (update: { status: string; data?: unknown }) => {
            switch (update.status) {
              case 'error':
                reject(new Error(`Offer error: ${update.data}`));
                break;
              case 'accepted':
                toast.success('Offer accepted!');
                resolve();
                break;
              case 'refunded':
                reject(new Error('Offer was rejected'));
                break;
            }
          },
        );
      });

      showSuccess({
        content: 'Transaction Submitted Successfully',
        duration: TOAST_DURATION.SUCCESS,
      });
    } catch (error) {
      showError({ content: error.message, duration: TOAST_DURATION.ERROR });
    } finally {
      if (toastId) toast.dismiss(toastId);
      useAppStore.setState({ loading: false });
    }
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
