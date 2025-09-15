import { Store } from '@subsquid/typeorm-store'
import {
  setupTestDatabase,
  type TestDatabase,
  createDefaultLog,
  miniHash
} from '../../testing'

import { handleLockPeriodUpdateds } from './lockPeriodUpdated'

describe('handleLockPeriodUpdateds integration', () => {
  let db: TestDatabase
  let store: Store

  beforeAll(async () => {
    db = await setupTestDatabase()
    store = new Store(() => db.dataSource.manager)
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('should process LockPeriodUpdated events and save them to the database', async () => {
    let lognum = 0

    const decodedMainTestLog = {
      lockPeriod: BigInt(miniHash('main' + 'lockPeriod')),
    }
    const mainTestLog = {
      contract: {
        name: 'NetworkControllers',
        instanceName: 'main',
        instanceAddress: '0xmain',
      },
      decoded: decodedMainTestLog,
      ...createDefaultLog(),
    }
    mainTestLog.id = lognum.toString()
    lognum += 1
    mainTestLog.block.height = miniHash('main' + 'height')
    mainTestLog.transactionHash = '0xmymaintransactionhashfromlog'

    const decodedAuxTestLog = {
      lockPeriod: BigInt(miniHash('aux' + 'lockPeriod')),
    }
    const auxTestLog = {
      contract: {
        name: 'NetworkControllers',
        instanceName: 'aux',
        instanceAddress: '0xaux',
      },
      decoded: decodedAuxTestLog,
      ...createDefaultLog(),
    }
    auxTestLog.id = lognum.toString()
    lognum += 1
    auxTestLog.block.height = miniHash('aux' + 'height')
    auxTestLog.transactionHash = '0xmyauxtransactionhashfromlog'

    // Minimal ProcessorContext mock
    const ctx = { store } as any
    const { lockPeriodUpdateds } = await handleLockPeriodUpdateds(
      'ethereum-mainnet',
      ctx,
      [mainTestLog, auxTestLog],
      { allowedVestedTargetUpdateds: [],  }
    )

    expect(lockPeriodUpdateds).toHaveLength(2)
    expect(lockPeriodUpdateds[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      ...decodedMainTestLog,
      txnHash: '0xmymaintransactionhashfromlog',
    })
    expect(lockPeriodUpdateds[1]).toMatchObject({
      id: auxTestLog.id,
      block: auxTestLog.block.height,
      ...decodedAuxTestLog,
      txnHash: '0xmyauxtransactionhashfromlog',
    })

    const dbTransfers = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('network_controllers_lock_period_updated', 't')
      .addOrderBy('id::int', 'ASC')
      .getRawMany()

    expect(dbTransfers).toHaveLength(2)
    expect(dbTransfers[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      txn_hash: '0xmymaintransactionhashfromlog',
      lock_period: decodedMainTestLog.lockPeriod.toString(),
    })
    expect(dbTransfers[1]).toMatchObject({
      id: auxTestLog.id,
      block: auxTestLog.block.height,
      txn_hash: '0xmyauxtransactionhashfromlog',
      lock_period: decodedAuxTestLog.lockPeriod.toString(),
    })
  })
})
