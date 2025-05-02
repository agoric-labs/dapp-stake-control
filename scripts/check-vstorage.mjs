#! /usr/bin/env node

const { vStorageUrl, valueToFind } = process.env;

const pollIntervalMs = 5000; // 5 seconds
const maxWaitMs = 2 * 60 * 1000; // 2 minutes
const startTime = Date.now();

export const makeFetchFromVStorage = (fetch) => {
  return async (vStorageUrl) => {
    const response = await fetch(vStorageUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`,
      );
    }

    const { value } = await response.json();

    const rawValue = JSON.parse(value)?.values?.[0];
    if (!rawValue) {
      throw new Error('Missing expected data in vStorage response');
    }

    const bodyString = JSON.parse(rawValue).body;
    return JSON.parse(bodyString.slice(1));
  };
};

let found = false;

while (Date.now() - startTime < maxWaitMs) {
  try {
    const fetchFromVStorage = makeFetchFromVStorage(fetch);
    const data = await fetchFromVStorage(vStorageUrl);

    console.log('DATA...', JSON.stringify(data));
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
