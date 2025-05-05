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
 * @import {Amount, Ratio,Brand, NatValue} from '@agoric/ertp';
 * @import {Pattern} from '@endo/patterns';
 * @import {PortfolioEvent} from './types';
 */

/**
 * @typedef {{
 *   portfolioFee: Amount<'nat'>;
 *   retainerMin: Amount<'nat'>;
 *   commission?: Ratio,
 *   validators: Record<string, Validator[]>;
 * }} StkCTerms
 */

/**
 * @enum {(typeof PollingFrequency)[keyof typeof PollingFrequency]}
 */
export const PollingFrequency = /** @type {const} */ ({
  daily: 'daily',
  weekly: 'weekly',
});
harden(PollingFrequency);

/**
 * @enum {(typeof ReceiptAction)[keyof typeof ReceiptAction]}
 */
export const ReceiptAction = /** @type {const} */ ({
  stake: 'stake',
});

/**
 * @enum {(typeof RewardsAction)[keyof typeof RewardsAction]}
 */
export const RewardsAction = /** @type {const} */ ({
  restake: 'restake',
});

/**
 * @typedef {{
 *   freq?: PollingFrequency;
 *   onReceipt?: Array<ReceiptAction>;
 *   onRewards?: Array<RewardsAction>;
 * }} RemoteConfig
 *
 * @typedef {{ [chainName: string]: RemoteConfig}} PortfolioConfig
 */

/**
 * @typedef {Object} Validator
 * @property {string} moniker
 * @property  {`${string}valoper1${string}`} operator_address
 * @property {number} commission_rate
 * @property {string} tokens
 */

const { values } = Object;

/** @type {TypedPattern<RemoteConfig>} */
export const RemoteConfigShape = M.splitRecord(
  {},
  {
    freq: M.or(...values(PollingFrequency)),
    onReceipt: M.arrayOf(M.or(...values(ReceiptAction))),
    onRewards: M.arrayOf(M.or(...values(RewardsAction))),
  },
);
harden(RemoteConfigShape);

/** @type {TypedPattern<PortfolioConfig>} */
export const PortfolioConfigShape = M.recordOf(M.string(), RemoteConfigShape);

/** @type {TypedPattern<StkCTerms>} */
export const customTermsShape = M.splitRecord(
  { portfolioFee: AmountShape, retainerMin: AmountShape },
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
 * @typedef {{
 *   makePortfolio: { give: {
 *     Fee: Amount<'nat'>,
 *     Retainer: Amount<'nat'>,
 *   }}
 * }} ProposalShapes
 */

/** @param {StkCTerms} ct */
export const makeProposalShapes = (ct) => {
  return harden({
    makePortfolio: M.splitRecord({
      give: M.splitRecord(
        { Fee: M.gte(ct.portfolioFee) },
        { Retainer: M.gte(ct.retainerMin) },
      ),
    }),
  });
};

/** @type {TypedPattern<PortfolioEvent>} */
export const PortfolioEventShape = M.any(); // TODO

/** @satisfies {{ [name: string]: [description: string, valueShape: Pattern] }} */
export const PUBLIC_TOPICS = {
  portfolio: ['Portfolio status', PortfolioEventShape],
};

/**
 * @param {RemoteConfig} plan
 */
export const planProps = (plan) => ({
  staking: (plan.onReceipt || []).includes('stake'),
  restaking: (plan.onRewards || []).includes('restake'),
});
