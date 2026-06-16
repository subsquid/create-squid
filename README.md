# create-squid: scaffold a TypeScript blockchain indexer

Code generation tool for [SQD](https://docs.sqd.dev) indexers a.k.a. squids. It scaffolds a ready-to-run TypeScript indexer from a YAML config and your contract ABIs. Capabilities:

 - works with EVM smart contracts;
 - makes multichain indexers;
 - fetches and decodes event logs, then stores them into Postgres;
 - has tests.

Limitations of the tool (will be removed in the future):
 - it requires a YAML config - no interactive mode;
 - it requires a JSON ABI file in the filesystem for every contract;
 - it has some missing functionality:
    * multiple events with the same name but different signature in a single ABI are not processed correctly;
    * addresses obtained by event decoding will not be consistent with the addresses used in the rest of the data: they will be in mixed case while the SDK-related addresses will be in flat lower case.

**Requirements:** NodeJS v20 or newer, Docker

The generated indexers are built on the [Squid SDK](https://github.com/subsquid/squid-sdk). See the [SQD documentation](https://docs.sqd.dev/en/sdk) for guides on customizing and deploying your squid.

## Quickstart

1. Create a folder for your new squid project, then a `./abi` subfolder in it.

2. Create a sample `createSquid.yaml` file in the current directory:

   ```yaml
   # yaml-language-server: $schema=https://cdn.subsquid.io/create-squid/create-squid.schema.json
   name: create-squid-ref-event-tables
   description: Reference squid for the one-table-per-event mode of the create-squid utility
   contracts:
     - name: Tokens
       abi: ./abi/erc20.json
       instances:
         - address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
           name: usdc
           network: ethereum-mainnet
           range:
             from: 6082465
         - address: "0x1337420dED5ADb9980CFc35f8f2B054ea86f8aB1"
           name: sqd
           network: arbitrum-one
           range:
             from: 194120655
       events:
         - "Transfer(address,address,uint256)"
     - name: AavePool
       abi: ./abi/aave-pool.json
       instances:
         - address: "0x02D84abD89Ee9DB409572f19B6e1596c301F3c81"
           proxy: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
           name: main
           network: ethereum-mainnet
           range:
             from: 11362579
       events:
         - "LiquidationCall(address,address,address,uint256,uint256,address,bool)"
   ```
   The top line works with RedHat's YAML extension on VSCode; edit it to work with your IDE. If you're working with an editor that doesn't use a language server, find the list of available networks [here](https://cdn.subsquid.io/archives/evm.json).

3. Edit `createSquid.yaml` to request all the events you need from your contracts. Save all ABIs you're using to `./abi`.

4. Run `npm create squid`.
    - if you prefer Yarn or PNPM to NPM, run `npm create squid --skip-install --skip-external-codegens` instead.

5. Follow the post-generation instructions from tool's stdout.
