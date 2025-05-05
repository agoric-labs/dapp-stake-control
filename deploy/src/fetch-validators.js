const chainOptions = ['osmosis', 'axelar'];

const CHAIN_LCD_URLS = {
  osmosis: 'https://lcd.osmosis.zone',
  axelar: 'https://axelar-lcd.quickapi.com',
};

/**
 * @import {Validator} from 'staking-contract';
 */

/**
 * Fetch validators for a specific Cosmos-based chain
 * @param {string} chain - Must be lowercase and match keys in CHAIN_LCD_URLS
 * @param {string} status - Validator bonding status (default: BOND_STATUS_BONDED)
 * @returns {Promise<Array<Validator>>}
 */
const fetchValidatorsForChain = async (
  chain,
  status = 'BOND_STATUS_BONDED',
) => {
  const lcdUrl = CHAIN_LCD_URLS[chain];
  if (!lcdUrl) throw new Error(`Unknown chain: ${chain}`);

  const url = new URL(`${lcdUrl}/cosmos/staking/v1beta1/validators`);
  url.searchParams.append('status', status);
  url.searchParams.append('pagination.limit', '100');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const data = await response.json();

  return data.validators.map((v) => ({
    moniker: v.description.moniker,
    operator_address: v.operator_address,
    commission_rate: parseFloat(v.commission.commission_rates.rate),
    tokens: v.tokens,
  }));
};

/**
 * Fetch validators from all chains and return result as an object
 * @returns {Promise<Record<string, Validator[]>>}
 */
export const fetchValidators = async () => {
  /** @type {Record<string, Validator[]>} */
  const results = {};

  for (const chain of chainOptions) {
    try {
      const validators = await fetchValidatorsForChain(chain);
      results[chain] = validators;
    } catch (err) {
      console.error(`Failed to fetch for ${chain}:`, err.message);
      results[chain] = [];
    }
  }

  return results;
};
