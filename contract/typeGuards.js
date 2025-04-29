import { AmountShape, RatioShape } from '@agoric/ertp/src/typeGuards.js';
import {
  ChainInfoShape,
  DenomDetailShape,
  DenomShape,
  OrchestrationPowersShape,
} from '@agoric/orchestration';
import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {CopySet} from '@endo/patterns';
 * @import {StakingTerms} from './stake.contract';
 * @import {Brand, NatValue} from '@agoric/ertp';
 */

/**
 * @typedef {{
 *   freq?: 'daily' | 'weekly';
 *   onReceipt?: CopySet<'stake'>;
 *   onRewards?: CopySet<'restake'>;
 * }} RemoteConfig
 *
 * @typedef {{ [chainName: string]: RemoteConfig}} PortfolioConfig
 */

/** @type {TypedPattern<PortfolioConfig>} */
export const PortfolioConfigShape = M.recordOf(
  M.string(),
  M.splitRecord(
    {},
    {
      freq: M.or('daily', 'weekly'),
      onReceipt: M.setOf(M.or('stake')),
      onRewards: M.setOf(M.or('restake')),
    },
  ),
);

/** @type {TypedPattern<StakingTerms>} */
export const customTermsShape = M.splitRecord(
  { portfolioFee: AmountShape },
  { commission: RatioShape },
);
harden(customTermsShape);

export const privateArgsShape = M.splitRecord(
  {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    marshaller: M.remotable('Marshaller'),
    chainInfo: M.recordOf(M.string(), ChainInfoShape),
    storageNode: M.remotable('StorageNode'),
  },
  {
    assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
  },
);
harden(privateArgsShape);

/**
 * @param {Brand} brand
 * @param {NatValue} [min]
 */
const makeAmountShape = (brand, min = undefined) =>
  harden({ brand, amount: typeof min === 'undefined' ? M.nat() : M.gte(min) });

/** @param {StakingTerms} ct */
export const makeProposalShapes = (ct) => {
  return harden({
    makePortfolio: M.splitRecord({
      give: M.splitRecord(
        { Fee: M.gte(ct.portfolioFee) },
        { Retainer: makeAmountShape(ct.portfolioFee.brand) },
      ),
    }),
  });
};
