// lockPeriodUpdated.ts
// This module maps LockPeriodUpdated event logs to
// any TypeORM model classes these logs might affect.

import {
  NetworkControllersAllowedVestedTargetUpdated,
  NetworkControllersLockPeriodUpdated
} from '../../model'
import {
  ProcessorContext,
  DecodedLogWithContractMetadata
} from '../../config'
import {
  NetworkName
} from '../../types/config'

export async function handleLockPeriodUpdateds(
  network: NetworkName,
  ctx: ProcessorContext,
  logs: DecodedLogWithContractMetadata[],
  previouslyProcessed: {
    allowedVestedTargetUpdateds: NetworkControllersAllowedVestedTargetUpdated[],
  },
): Promise<{
  allowedVestedTargetUpdateds: NetworkControllersAllowedVestedTargetUpdated[],
  lockPeriodUpdateds: NetworkControllersLockPeriodUpdated[],
}> {

  const lockPeriodUpdateds = logs.map(l => new NetworkControllersLockPeriodUpdated({
    id: l.id,
    network,
    instanceAddress: l.contract.instanceAddress,
    block: l.block.height,
    txnHash: l.transactionHash,
    lockPeriod: l.decoded.lockPeriod,
  }))

  await ctx.store.insert(lockPeriodUpdateds)

  return {
    ...previouslyProcessed,
    lockPeriodUpdateds,
  }
}
