// approved.ts
// This module maps Approved event logs to
// any TypeORM model classes these logs might affect.

import {
  NetworkControllersAllowedVestedTargetUpdated,
  NetworkControllersLockPeriodUpdated,
  DistributedRewardsDistributionApproved
} from '../../model'
import {
  ProcessorContext,
  DecodedLogWithContractMetadata
} from '../../config'
import {
  NetworkName
} from '../../types/config'

export async function handleApproveds(
  network: NetworkName,
  ctx: ProcessorContext,
  logs: DecodedLogWithContractMetadata[],
  previouslyProcessed: {
    allowedVestedTargetUpdateds: NetworkControllersAllowedVestedTargetUpdated[],
    lockPeriodUpdateds: NetworkControllersLockPeriodUpdated[],
  },
): Promise<{
  allowedVestedTargetUpdateds: NetworkControllersAllowedVestedTargetUpdated[],
  lockPeriodUpdateds: NetworkControllersLockPeriodUpdated[],
  approveds: DistributedRewardsDistributionApproved[],
}> {

  const approveds = logs.map(l => new DistributedRewardsDistributionApproved({
    id: l.id,
    network,
    instanceAddress: l.contract.instanceAddress,
    block: l.block.height,
    blockTimestamp: BigInt(l.block.timestamp),
    txnHash: l.transactionHash,
    who: l.decoded.who,
    fromBlock: l.decoded.fromBlock,
    toBlock: l.decoded.toBlock,
    commitment: l.decoded.commitment,
  }))

  await ctx.store.insert(approveds)

  return {
    ...previouslyProcessed,
    approveds,
  }
}
