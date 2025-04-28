import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {CopySet} from '@endo/patterns';
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

/** @type {TypedPattern<ProfileConfig>} */
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
