import { StargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { stringToPath } from '@cosmjs/crypto';
import { toast } from 'react-toastify';
import { BalanceCheckParams } from './interfaces/interfaces';

export const getSigner = async () => {
  const mnemonic = import.meta.env.VITE_MNEMONIC;

  if (!mnemonic) {
    throw new Error('Mnemonic not found in environment variables.');
  }

  const Agoric = {
    Bech32MainPrefix: 'agoric',
    CoinType: 564,
  };
  const hdPath = (coinType = 118, account = 0) =>
    stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: Agoric.Bech32MainPrefix,
    hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
  });
};

export const checkBalance = async ({
  walletAddress,
  rpcUrl,
  tokenDenom,
}: BalanceCheckParams): Promise<number> => {
  try {
    const client = await StargateClient.connect(rpcUrl);
    const balances = await client.getAllBalances(walletAddress);

    console.log(`Balance for ${walletAddress}: ${JSON.stringify(balances)}`);

    if (balances.length === 0) {
      console.log('Balances array is empty');
      return 0;
    }

    for (let balance of balances) {
      if (tokenDenom == balance.denom) {
        return parseFloat(balance.amount) / 1_000_000;
      }
    }

    client.disconnect();
    return 0;
  } catch (error) {
    console.error(`Failed to fetch balance: ${error.message}`);
    return 0;
  }
};

export const showSuccess = ({ content, duration }) => {
  toast.success(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showError = ({ content, duration }) => {
  toast.error(content, {
    position: 'top-right',
    // autoClose: duration,
  });
};

export const showWarning = ({ content, duration }) => {
  toast.warn(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const wait = async (seconds) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
