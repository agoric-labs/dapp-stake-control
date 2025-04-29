import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import fetchedChainInfo from './utils/fetched-chain-info.js';
import type { ExecutionContext, TestFn } from 'ava';
import { makeWalletFactoryContext } from './utils/walletFactory.js';
import { assetInfo } from '../src/info.js';
import type { ContinuingInvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { SmartWalletDriver } from './utils/drivers.js';

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

type MakeOfferParams = {
  wallet: SmartWalletDriver;
  previousOffer: string;
  methodName: string;
  offerArgs: any;
  proposal: any;
};

const makeTestContext = async (t: ExecutionContext) => {
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

  const wallet =
    await ctx.walletFactoryDriver.provideSmartWallet('agoric1makeAccount');

  const fullCtx = {
    ...ctx,
    wallet,
  };

  return fullCtx;
};

let offerCounter = 0;

const makeOffer = async ({
  wallet,
  methodName,
  offerArgs,
  proposal,
  previousOffer,
}: MakeOfferParams) => {
  const id = `offer-${offerCounter}`;

  const proposeInvitationSpec: ContinuingInvitationSpec = {
    source: 'continuing',
    previousOffer,
    invitationMakerName: 'makeStakeManagementInvitation',
    invitationArgs: harden([methodName, offerArgs]),
  };

  offerCounter += 1;

  await wallet.executeOffer({
    id,
    invitationSpec: proposeInvitationSpec,
    proposal,
  });
  await eventLoopIteration();
  return id;
};

test.before(async (t) => {
  t.context = await makeTestContext(t);

  const { evalProposal, buildProposal } = t.context;

  await evalProposal(
    buildProposal(
      '../test/asset-builder/register-interchain-bank-assets.builder.js',
      [
        '--assets',
        JSON.stringify([
          {
            denom: 'uosmo',
            issuerName: 'OSMO',
            decimalPlaces: 6,
          },
        ]),
      ],
    ),
  );

  await evalProposal(
    buildProposal('../src/init-contract.js', [
      '--chainInfo',
      JSON.stringify({
        agoric: fetchedChainInfo.agoric,
        osmosis: fetchedChainInfo.osmosis,
      }),
      '--assetInfo',
      assetInfo,
    ]),
  );
});

test.beforeEach((t) => {
  t.context.storage.data.delete('published.StkC.log');
});

test.serial('make LCA via stakeManagement', async (t) => {
  const {
    storage,
    wallet,
    bridgeUtils: { runInbound },
  } = t.context;

  t.log('execute make LCA');
  const { BLD } = t.context.agoricNamesRemotes.brand;

  await wallet.sendOffer({
    id: 'makeLCACall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeManagement'],
      callPipe: [['makeStakingPortfolio']],
    },
    proposal: {
      // @ts-ignore
      give: { BLD: { brand: BLD, value: 1n } },
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.StkC.log')!).values;

  t.deepEqual(getLogged(), ['Inside createAndMonitorLCA']);
});
