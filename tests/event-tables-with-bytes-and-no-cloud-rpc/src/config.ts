import {
  FieldSelection,
  BlockHeader as _BlockHeader,
  Log as _Log,
  Transaction as _Transaction,
  Trace as _Trace,
  StateDiff as _StateDiff,
  DataHandlerContext
} from '@subsquid/evm-processor'

import {Store as TypeormStore} from '@subsquid/typeorm-store'

import {
  NetworkConfig as _NetworkConfig,
  FullConfig as _FullConfig,
  ContractConfig as _ContractConfig,
  EventConfig as _EventConfig
} from  './types/config'

import {
  DecodedLogWithContractMetadata as _DecodedLogWithContractMetadata
} from './types/extendedData'

import * as networkControllerAbi from './abi/networkController'
import * as distributedRewardsDistributionAbi from './abi/distributedRewardsDistribution'

import { handleAllowedVestedTargetUpdateds } from './batchHandlers/networkControllers/allowedVestedTargetUpdated'
import { handleLockPeriodUpdateds } from './batchHandlers/networkControllers/lockPeriodUpdated'
import { handleApproveds } from './batchHandlers/distributedRewardsDistribution/approved'

// Can vary by network/processor, but we'll use a single global value here.
export const fieldSelection = {
  log: {
    address: true,
    data: true,
    topics: true,
    transactionHash: true,
  },
} as const // Without "as const" downstream types will break.
// Temporarily designate "as FieldSelection" to gain IDE field suggestions.

/***** types for use in handlers *****/

export type BlockHeader = _BlockHeader<typeof fieldSelection>
export type Log = _Log<typeof fieldSelection>
export type Transaction = _Transaction<typeof fieldSelection>
export type Trace = _Trace<typeof fieldSelection>
export type StateDiff = _StateDiff<typeof fieldSelection>
export type ProcessorContext = DataHandlerContext<TypeormStore, typeof fieldSelection>

export type NetworkConfig = _NetworkConfig<TypeormStore, typeof fieldSelection>
export type FullConfig = _FullConfig<TypeormStore, typeof fieldSelection>
export type ContractConfig = _ContractConfig<TypeormStore, typeof fieldSelection>
export type EventConfig = _EventConfig<TypeormStore, typeof fieldSelection>

export type DecodedLogWithContractMetadata = _DecodedLogWithContractMetadata<typeof fieldSelection>

/***** types for use in handlers - end *****/

export const config: FullConfig = {
  'arbitrum-one': {
    gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
    rpcEndpoint: process.env.RPC_ARBITRUM_ONE_HTTP,
    finalityConfirmation: 120,
    requests: [
      {
        contract: 'NetworkControllers',
        addresses: {
          'main': '0xf5462EF65Ca8a9Cca789c912Bc8ada80b582d68d'.toLowerCase(),
        },
        events: [
          {
            name: 'AllowedVestedTargetUpdated',
            abiHelper: networkControllerAbi.events.AllowedVestedTargetUpdated,
            batchHandler: handleAllowedVestedTargetUpdateds,
          },
          {
            name: 'LockPeriodUpdated',
            abiHelper: networkControllerAbi.events.LockPeriodUpdated,
            batchHandler: handleLockPeriodUpdateds,
          },
        ],
        range: {
          from: 6082465,
        },
      },
      {
        contract: 'DistributedRewardsDistribution',
        addresses: {
          'secondary': '0x02D84abD89Ee9DB409572f19B6e1596c301F3c81'.toLowerCase(),
        },
        events: [
          {
            name: 'Approved',
            abiHelper: distributedRewardsDistributionAbi.events.Approved,
            batchHandler: handleApproveds,
          },
        ],
        range: {
          from: 11362579,
        },
      },
    ],
  },
  '0g-testnet': {
    gateway: 'https://v2.archive.subsquid.io/network/0g-testnet',
    rpcEndpoint: process.env.RPC_0G_TESTNET_HTTP,
    finalityConfirmation: 500,
    requests: [
      {
        contract: 'NetworkControllers',
        addresses: {
          'aux': '0xf5462EF65Ca8a9Cca789c912Bc8ada80b582d68d'.toLowerCase(),
        },
        events: [
          {
            name: 'AllowedVestedTargetUpdated',
            abiHelper: networkControllerAbi.events.AllowedVestedTargetUpdated,
            batchHandler: handleAllowedVestedTargetUpdateds,
          },
          {
            name: 'LockPeriodUpdated',
            abiHelper: networkControllerAbi.events.LockPeriodUpdated,
            batchHandler: handleLockPeriodUpdateds,
          },
        ],
        range: {
          from: 194120655,
        },
      },
    ],
  },
  'ethereum-mainnet': {
    gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
    rpcEndpoint: process.env.RPC_ETH_HTTP,
    finalityConfirmation: 64,
    requests: [
      {
        contract: 'DistributedRewardsDistribution',
        addresses: {
          'primary': '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'.toLowerCase(),
        },
        events: [
          {
            name: 'Approved',
            abiHelper: distributedRewardsDistributionAbi.events.Approved,
            batchHandler: handleApproveds,
          },
        ],
        range: {
          from: 11362579,
        },
      },
    ],
  },
}
