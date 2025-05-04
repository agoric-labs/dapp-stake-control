import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import type {
  RelativeTimeRecord,
  TimestampRecord,
} from '@agoric/time/src/types';
import { preparePollingKit } from '../polling-kit.js';
import { provideDurableZone } from './fusdc-tools/supports.ts';

test('polling kit wakes items at regular intervals', async (t) => {
  const zone = provideDurableZone('polling-test');
  const events = [] as Array<[number, TimestampRecord]>;
  const makeItem = zone.exoClass('I', undefined, (id) => ({ id }), {
    async wake(ts) {
      events.push([this.state.id, ts.absValue]);
    },
  });
  const items = [1, 2].map(makeItem);

  const timerService = buildManualTimer(t.log);
  const timerBrand = timerService.getTimerBrand();
  const zoneP = zone.subZone('polling');

  const interval: RelativeTimeRecord = harden({ timerBrand, relValue: 3n });
  const makePollingKit = preparePollingKit(zoneP, timerService);
  const pk = makePollingKit(interval);
  await t.notThrowsAsync(pk.admin.start());

  for (const item of items) {
    pk.store.addItem(item);
  }

  t.deepEqual(events, []);
  for (let t = 1n; t < 8n; t += 2n) {
    timerService.advanceTo(t);
    await eventLoopIteration();
  }

  pk.admin.stop();

  t.deepEqual(events, [
    [1, 0n],
    [2, 0n],
    [1, 3n],
    [2, 3n],
    [1, 6n],
    [2, 6n],
  ]);
});
