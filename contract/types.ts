import type { Amount } from '@agoric/ertp';

export type PortfolioEvent = {
  retainerBalance: Amount<'nat'>;
  // indicates that the portfolio is unbonding
  // and when the result will be available for withdrawal.
  unbondingTime?: bigint; // seconds
  // if the portfolio is not liquidating, any
  // deposits will be staked.
  staking: boolean;
  // if the portfolio discovers unclaimed rewards,
  // it will claim and restake them.
  restaking: boolean;
} & (
  | {
      type: 'opened';
    }
  | {
      // indicates that the contract has paused its
      // timer because its retainer has run too low.
      // the contract can be resumed by injecting
      // sufficient funds to schedule further
      // actions.
      type: 'paused';
    }
  | {
      // indicates that the portfolio has been fully
      // liquidated and all funds returned to the
      // holder including any residual retainer.
      type: 'closed';
    }
  | {
      // indicates that funds were withdrawn from
      // the portfolio.
      type: 'withdrawl';
      denom: string;
      amount: bigint;
    }
  | {
      // indicates that the portfolio discovered
      // funds deposited into the portfolio.
      type: 'deposit';
      denom: string;
      amount: bigint;
    }
  | {
      // indicates that unstaked tokens were found in
      // the portfolio and were automatically staked
      type: 'stake';
      denom: string;
      validator: string;
      quantity: bigint;
      balance: bigint;
    }
  | {
      // indicates that the portfolio is closing and
      // that the given position has been unstaked.
      // the funds will remain in the portfolio
      // until withdrawn.
      type: 'unstake';
      denom: string;
      validator: string;
      quantity: bigint;
    }
  | {
      // indicates that the contract found and withdrew
      // rewards.
      // they may be
      // automatically restaked.
      type: 'claim';
      denom: string;
      balance: bigint;
    }
);
