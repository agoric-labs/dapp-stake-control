## Install Dependencies

Before running any commands, install all project dependencies:

```
yarn install
```

## Directory Structure

- **`contract/`**  
  Contains the smart contract source code.

- **`deploy/`**  
  Contains scripts for deploying the contract and running bootstrap tests.

- **`ui/`**  
  Contains the code for the user interface.

## Start the UI

```
yarn start:ui
```

## Deploy Contract on Local Chain

- Start the local chain:

  ```
  yarn start:chain
  ```

- Deploy the contract:

  ```
  yarn deploy:contract
  ```

## Run Tests

```
yarn test
```

## Relayer setup between Agoric Local Chain and Osmosis testnet

The Hermes relayer will facilitate IBC transfers between `agoriclocal` and `osmo-test-5`. To proceed, install Hermes on your computer by following [this installation guide](https://hermes.informal.systems/quick-start/installation.html#install-by-downloading).

Once Hermes is installed, start the relayer. Wait for a success message similar to the one below:

```bash
SUCCESS Channel {
    ordering: Unordered,
    a_side: ChannelSide {
        chain: BaseChainHandle {
            chain_id: ChainId {
                id: "agoriclocal",
                version: 0,
            },
            ...
        },
        client_id: ClientId("07-tendermint-0"),
        connection_id: ConnectionId("connection-0"),
        port_id: PortId("transfer"),
        channel_id: Some(ChannelId("channel-0")),
        version: None,
    },
    b_side: ChannelSide {
        chain: BaseChainHandle {
            chain_id: ChainId {
                id: "osmo-test-5",
                version: 5,
            },
            ...
        },
        client_id: ClientId("07-tendermint-4393"),
        connection_id: ConnectionId("connection-3835"),
        port_id: PortId("transfer"),
        channel_id: Some(ChannelId("channel-10104")),
        version: None,
    },
    connection_delay: 0ns,
}
```

Copy the following values from the success message for both Agoric Local Chain (`agoriclocal`) and Osmosis Testnet (`osmo-test-5`):

- `connection_id`
- `channel_id`
- `client_id`

Then, update these values in `contract/info.js`. This file stores the chain and channel details required for the contract proposal, ensuring the connection is properly registered with ChainHub.

## Setup Axelar Local Dev

Follow these steps to set up and test the local Agoric-to-Axelar bridge environment:

### 1. Register Tokens: AXL

Navigate to [Agoric SDK](https://github.com/Agoric/agoric-sdk) directory and run:

```bash
agoric run multichain-testing/src/register-interchain-bank-assets.builder.js --assets='[{"denom":"ibc/<IBC-DENOM-FOR-TOKEN>","issuerName":"<NAME>","decimalPlaces":6}]'
```

Replace:

- `<IBC-DENOM-FOR-TOKEN>` → `ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0`
- `<NAME>` → `AXL`
- `decimalPlaces` → `6`.

This command will create some bundle files. Copy them to `deploy` folder in project’s root. After copying the files, run:

```bash
yarn register:token
```

### 2. Clone the Axelar Local Dev Environment

```
git clone https://github.com/agoric-labs/agoric-to-axelar-local.git
cd agoric-to-axelar-local

```

### 3. Install Dependencies and Build the Project

```
npm install
npm run build

```

### 4. Start the Environment

```
cd packages/axelar-local-dev-cosmos
npm run start

```

This starts the local Agoric chain, a local Axelar chain, and sets up the relayer between them. Once everything is set, run this command to start relaying data:

```
npm run relay
```
