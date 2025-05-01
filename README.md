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
