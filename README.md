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

- Start the local chain:

  ```
  yarn start:chain
  ```

- Install dependencies for deployment:

  ```
  (cd contract; yarn install)
  (cd deploy; yarn install)
  ```

- Deploy the contract:

  ```
  (cd deploy; yarn deploy)
  ```

## Run Tests

```
cd deploy && yarn test
```
