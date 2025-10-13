// allowedVestedTargetUpdated.ts
// This module maps AllowedVestedTargetUpdated event logs to
// any TypeORM model classes these logs might affect.

import {
  NetworkControllersAllowedVestedTargetUpdated
} from '../../model'
import {
  ProcessorContext,
  DecodedLogWithContractMetadata
} from '../../config'
import {
  NetworkName
} from '../../types/config'

export async function handleAllowedVestedTargetUpdateds(
  network: NetworkName,
  ctx: ProcessorContext,
  logs: DecodedLogWithContractMetadata[],
  previouslyProcessed: {
  },
): Promise<{
  allowedVestedTargetUpdateds: NetworkControllersAllowedVestedTargetUpdated[],
}> {

  const allowedVestedTargetUpdateds = logs.map(l => new NetworkControllersAllowedVestedTargetUpdated({
    id: l.id,
    network,
    instanceAddress: l.contract.instanceAddress,
    block: l.block.height,
    blockTimestamp: BigInt(l.block.timestamp),
    txnHash: l.transactionHash,
    target: l.decoded.target,
    isAllowed: l.decoded.isAllowed,
  }))

  await ctx.store.insert(allowedVestedTargetUpdateds)

  return {
    ...previouslyProcessed,
    allowedVestedTargetUpdateds,
  }
}
