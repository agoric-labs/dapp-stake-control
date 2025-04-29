import type { Brand, Purse } from '@agoric/ertp';
import { deeplyFulfilledObject, NonNullish } from '@agoric/internal';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { VowTools } from '@agoric/vow';
import type {
  Invitation,
  IssuerKeywordRecord,
  PaymentKeywordRecord,
  ZoeService,
} from '@agoric/zoe';
import type {
  Installation,
  StartParams,
} from '@agoric/zoe/src/zoeService/utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { objectMap } from '@endo/patterns';

// adapted from https://github.com/Agoric/agoric-sdk/blob/e3f38fcfaf456883731e5f1a609f3096e794f31d/packages/boot/test/smartWallet/wallet-fun.test.ts
export const startContract = async <SF extends (...args: any[]) => any>(
  contractExports: Record<string, unknown>,
  {
    name = undefined as string | undefined,
    issuers = {} as IssuerKeywordRecord,
    terms = {} as StartParams<SF>['terms'],
    privateArgs = {} as Parameters<SF>[1],
  } = {},
) => {
  let contractBaggage;
  const setJig = ({ baggage }) => {
    contractBaggage = baggage;
  };
  const { zoe, bundleAndInstall } = await setUpZoeForTest({ setJig });
  const installation: Installation<SF> =
    await bundleAndInstall(contractExports);

  const startKit = await E(zoe).startInstance(
    installation,
    issuers,
    terms,
    privateArgs,
  );
  return { ...startKit, contractBaggage, zoe };
};

/**
 * Approximate smart wallet API
 *
 * @param zoe from startContract
 * @param when from vowTools
 * @param spec note: only source: 'contract' is supported
 * @param providePurse where to get payments?
 */
export const executeOffer = async (
  zoe: ZoeService,
  when: VowTools['when'],
  spec: OfferSpec,
  providePurse?: (b: Brand) => Purse,
) => {
  const { invitationSpec, proposal } = spec;
  assert.equal(invitationSpec.source, 'contract', 'not supported');
  const { instance, publicInvitationMaker, invitationArgs } = invitationSpec;
  const invitation: Invitation = await E(E(zoe).getPublicFacet(instance))[
    publicInvitationMaker
  ](...(invitationArgs || []));

  const payments = (proposal.give
    ? await deeplyFulfilledObject(
        objectMap(proposal.give, (amt) =>
          NonNullish(providePurse, 'providePurse')(amt.brand).withdraw(amt),
        ),
      )
    : {}) as unknown as PaymentKeywordRecord;
  const seat = await E(zoe).offer(invitation, proposal, payments);
  const result = await when(E(seat).getOfferResult());
  const payouts = await E(seat).getPayouts();
  return { result, payouts };
};
