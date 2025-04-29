import React from 'react';
import { showError, showSuccess } from '../Utils';
import { TOAST_DURATION } from '../config';
import { useAppStore } from '../state';
import { toast } from 'react-toastify';

export const FundAccount = () => {
  const { wallet, contractInstance, brands, latestInvitation } =
    useAppStore.getState();

  const makeOffer = async () => {
    let toastId: string | number | null = null;

    try {
      if (!contractInstance) throw new Error('No contract instance');
      if (!brands) throw new Error('Brands not initialized');
      if (!wallet) throw new Error('Wallet not connected');

      const OSMO = {
        brandKey: 'OSMO',
        decimals: 6,
      };

      const requiredBrand = brands[OSMO.brandKey];
      const amountValue = BigInt(8000);

      const give = {
        [OSMO.brandKey]: {
          brand: requiredBrand,
          value: amountValue,
        },
      };

      const args = {
        id: Date.now(),
        invitationSpec: {
          source: 'continuing',
          previousOffer: latestInvitation,
          invitationMakerName: 'makeStakeManagementInvitation',
          invitationArgs: harden(['fundOsmo', []]),
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
    <div className="dashboard-container">
      <div className="dashboard">
        <div className="transfer-form">
          <button className="invoke-button" onClick={makeOffer}>
            Fund Account
          </button>
        </div>
      </div>
    </div>
  );
};
