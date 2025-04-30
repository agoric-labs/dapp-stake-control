#!/bin/bash
set -e

TARGET_HEIGHT=$1
SLEEP=10
RPC=http://localhost:26657

echo "Waiting for the Agoric service to be fully ready..."
echo "Target block height: $TARGET_HEIGHT"

while true; do
    response=$(curl --silent "$RPC/abci_info")
    height=$(echo "$response" | jq -r ".result.response.last_block_height | tonumber")

    if [ "$height" -ge "$TARGET_HEIGHT" ]; then
        echo "Service is ready! Last block height: $height"
        break
    else
        echo "Waiting for block height $height to reach $TARGET_HEIGHT..."
        sleep $SLEEP
    fi
done
