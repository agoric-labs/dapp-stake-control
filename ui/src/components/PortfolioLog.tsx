import React, { useState, useEffect } from 'react';
import { useAppStore } from '../state';

type PortfolioEvent = {
  timestamp: string,
  retainerBalance: bigint,
  // indicates that the portfolio is liquidating.
  // any deposits, albeit claimed rewards, will be
  // returned to the holder when discovered.
  liquidating: boolean,
  // if the portfolio is not liquidating, any
  // deposits, albeit claimed rewards, will be
  // staked.
  staking: boolean,
  // if the portfolio discovers unclaimed rewards,
  // it will claim them.
  claiming: boolean,
} & (
  {
    type: 'opened'
  } | {
    // indicates that the contract has paused its
    // timer because its retainer has run too low.
    // the contract can be resumed by injecting
    // sufficient funds to schedule further
    // actions.
    type: 'paused'
  } | {
    // indicates that the portfolio has been fully
    // liquidated and all funds returned to the
    // holder including any residual retainer.
    type: 'closed'
  } | {
    // indicates that funds were withdrawn from
    // the portfolio.
    type: 'withdrawl',
    denom: string,
    amount: bigint,
  } | {
    // indicates that the portfolio discovered
    // funds deposited into the portfolio.
    type: 'deposit',
    denom: string,
    amount: bigint,
  } | {
    // indicates that unstaked tokens were found in
    // the portfolio and were automatically staked
    type: 'stake',
    denom: string,
    validator: string,
    quantity: bigint,
    balance: bigint,
  } | {
    // indicates that the portfolio is closing and 
    // that the given position has been unstaked.
    // the funds will remain in the portfolio
    // until withdrawn.
    type: 'unstake',
    denom: string,
    validator: string,
    quantity: bigint,
  } | {
    // indicates that the contract found unclaimed
    // rewards and initiated a claim.
    // when the rewards arrive, they may be
    // automatically restaked.
    type: 'claim',
    denom: string,
    balance: bigint,
  }
);

const delay = (ms, cancelled): void => {
  const { promise, resolve, reject } = Promise.withResolvers();
  const timerId = setTimeout(() => resolve(), ms);
  cancelled.catch((reason) => {
    clearTimeout(timerId);
    reject(reason);
  });
  return promise;
};

export const simulatePortfolioLogWatcher = async (
  setLog: (event: PortfolioEvent) => void,
  cancelled: Promise<never>,
) => {
  let log: Array<PortfolioEvent> = [];
  const append = (entry: PortfolioEvent) => {
    log = [...log, entry];
    setLog(log);
  };

  await delay(1000, cancelled);
  append({ type: 'created' });

  await delay(1000, cancelled);
  append({ type: 'staked' });

  await delay(1000, cancelled);
  append({ type: 'claimed' });

  await delay(1000, cancelled);
  append({ type: 'rewarded' });

  await delay(1000, cancelled);
  append({ type: 'destroyed' });
};

export default function PortfolioLog() {
  const { wallet, portfolioId } = useAppStore.getState();

  const [log, setLog] = useState();

  useEffect(() => {
    // TODO
    // watcher.watchLatest<Array<PortfolioEvent>>(
    //   [Kind.Data, `published.StkC.portfolios.${portfolioId}`],
    //   setLog,
    // );
    // TODO
    // release watcher on returned effect dispose callback
    const { reject: cancel, promise: cancelled } = Promise.withResolvers();
    simulatePortfolioLogWatcher(setLog, cancelled);
    return cancel;
  }, [wallet]);

  if (!log) {
    return 'Loading Portfolio…';
  } else {
    return log.map((entry, index) => {
      return <div key={index}>{JSON.stringify(entry)}</div>;
    });
  }
}
