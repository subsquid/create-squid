import { Store } from '@subsquid/typeorm-store'
import {
  setupTestDatabase,
  type TestDatabase,
  createDefaultLog,
  miniHash
} from '../../testing'

import { handleApproveds } from './approved'

describe('handleApproveds integration', () => {
  let db: TestDatabase
  let store: Store

  beforeAll(async () => {
    db = await setupTestDatabase()
    store = new Store(() => db.dataSource.manager)
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('should process Approved events and save them to the database', async () => {
    let lognum = 0

    const decodedPrimaryTestLog = {
      who: '0xwhoPrimary',
      fromBlock: BigInt(miniHash('primary' + 'fromBlock')),
      toBlock: BigInt(miniHash('primary' + 'toBlock')),
      commitment: new Uint8Array(Buffer.from('commitmentPrimary', 'utf8')),
    }
    const primaryTestLog = {
      contract: {
        name: 'DistributedRewardsDistribution',
        instanceName: 'primary',
        instanceAddress: '0xprimary',
      },
      decoded: decodedPrimaryTestLog,
      ...createDefaultLog(),
    }
    primaryTestLog.id = lognum.toString()
    lognum += 1
    primaryTestLog.block.height = miniHash('primary' + 'height')
    primaryTestLog.block.timestamp = miniHash('primary' + 'timestamp')
    primaryTestLog.transactionHash = '0xmyprimarytransactionhashfromlog'

    const decodedSecondaryTestLog = {
      who: '0xwhoSecondary',
      fromBlock: BigInt(miniHash('secondary' + 'fromBlock')),
      toBlock: BigInt(miniHash('secondary' + 'toBlock')),
      commitment: new Uint8Array(Buffer.from('commitmentSecondary', 'utf8')),
    }
    const secondaryTestLog = {
      contract: {
        name: 'DistributedRewardsDistribution',
        instanceName: 'secondary',
        instanceAddress: '0xsecondary',
      },
      decoded: decodedSecondaryTestLog,
      ...createDefaultLog(),
    }
    secondaryTestLog.id = lognum.toString()
    lognum += 1
    secondaryTestLog.block.height = miniHash('secondary' + 'height')
    secondaryTestLog.block.timestamp = miniHash('secondary' + 'timestamp')
    secondaryTestLog.transactionHash = '0xmysecondarytransactionhashfromlog'

    // Minimal ProcessorContext mock
    const ctx = { store } as any
    const { approveds } = await handleApproveds(
      'ethereum-mainnet',
      ctx,
      [primaryTestLog, secondaryTestLog],
      { allowedVestedTargetUpdateds: [], lockPeriodUpdateds: [],  }
    )

    expect(approveds).toHaveLength(2)
    expect(approveds[0]).toMatchObject({
      id: primaryTestLog.id,
      block: primaryTestLog.block.height,
      blockTimestamp: BigInt(primaryTestLog.block.timestamp),
      ...decodedPrimaryTestLog,
      txnHash: '0xmyprimarytransactionhashfromlog',
    })
    expect(approveds[1]).toMatchObject({
      id: secondaryTestLog.id,
      block: secondaryTestLog.block.height,
      blockTimestamp: BigInt(secondaryTestLog.block.timestamp),
      ...decodedSecondaryTestLog,
      txnHash: '0xmysecondarytransactionhashfromlog',
    })

    const dbTransfers = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('distributed_rewards_distribution_approved', 't')
      .addOrderBy('id::int', 'ASC')
      .getRawMany()

    expect(dbTransfers).toHaveLength(2)
    expect(dbTransfers[0]).toMatchObject({
      id: primaryTestLog.id,
      block: primaryTestLog.block.height,
      block_timestamp: primaryTestLog.block.timestamp.toString(),
      txn_hash: '0xmyprimarytransactionhashfromlog',
      who: decodedPrimaryTestLog.who,
      from_block: decodedPrimaryTestLog.fromBlock.toString(),
      to_block: decodedPrimaryTestLog.toBlock.toString(),
      commitment: Object.fromEntries(decodedPrimaryTestLog.commitment.entries()),
    })
    expect(dbTransfers[1]).toMatchObject({
      id: secondaryTestLog.id,
      block: secondaryTestLog.block.height,
      block_timestamp: secondaryTestLog.block.timestamp.toString(),
      txn_hash: '0xmysecondarytransactionhashfromlog',
      who: decodedSecondaryTestLog.who,
      from_block: decodedSecondaryTestLog.fromBlock.toString(),
      to_block: decodedSecondaryTestLog.toBlock.toString(),
      commitment: Object.fromEntries(decodedSecondaryTestLog.commitment.entries()),
    })
  })
})
