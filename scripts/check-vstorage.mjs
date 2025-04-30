#! /usr/bin/env node
import { fetchFromVStorage } from './utils.mjs';

const { vStorageUrl, valueToFind } = process.env;

const pollIntervalMs = 5000; // 5 seconds
const maxWaitMs = 2 * 60 * 1000; // 2 minutes
const startTime = Date.now();

let found = false;

while (Date.now() - startTime < maxWaitMs) {
  try {
    const data = await fetchFromVStorage(vStorageUrl);

    for (const val of data) {
      if (val[0] === valueToFind) {
        found = true;
        break;
      }
    }

    if (found) {
      console.log(`Test passed: ${valueToFind} was found.`);
      break;
    }

    console.log(`Not found yet. Waiting ${pollIntervalMs / 1000} seconds...`);
    await new Promise((res) => setTimeout(res, pollIntervalMs));
  } catch (error) {
    console.error('Error fetching vStorage:', error);
  }
}

if (!found) {
  console.error(`Test failed: ${valueToFind} was not found after 2 minutes.`);
  process.exitCode = 1;
}
