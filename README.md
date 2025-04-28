## Directory Structure

- **`contract/`**  
  Contains the smart contract source code.

- **`deploy/`**  
  Contains scripts for deploying the contract and running bootstrap tests.

- **`ui/`**  
  Contains the code for the user interface.

## Start the UI

```
cd ui && yarn install
yarn dev
```

## Deploy Contract on Local Chain

- Start the local chain by running the following command.
  Important: Ensure the container is named `agoric`.

  ```
  docker run -d --name agoric -p 26657:26657 -p 1317:1317 -p 9090:9090 ghcr.io/agoric/agoric-3-proposals:latest

  ```

- Install dependencies for deployment:

  ```
  yarn install
  ```

- Deploy the contract:

  ```
  yarn deploy
  ```

## Run Tests

```
cd deploy && yarn test
```
