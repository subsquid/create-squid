import { Store } from '@subsquid/typeorm-store'
import {
  setupTestDatabase,
  type TestDatabase,
  createDefaultLog,
  miniHash
} from '../../testing'

import { handleAllowedVestedTargetUpdateds } from './allowedVestedTargetUpdated'

describe('handleAllowedVestedTargetUpdateds integration', () => {
  let db: TestDatabase
  let store: Store

  beforeAll(async () => {
    db = await setupTestDatabase()
    store = new Store(() => db.dataSource.manager)
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('should process AllowedVestedTargetUpdated events and save them to the database', async () => {
    let lognum = 0

    const decodedMainTestLog = {
      target: '0xtargetMain',
      isAllowed: true,
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
      target: '0xtargetAux',
      isAllowed: true,
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
    const { allowedVestedTargetUpdateds } = await handleAllowedVestedTargetUpdateds(
      'ethereum-mainnet',
      ctx,
      [mainTestLog, auxTestLog],
      {}
    )

    expect(allowedVestedTargetUpdateds).toHaveLength(2)
    expect(allowedVestedTargetUpdateds[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      ...decodedMainTestLog,
      txnHash: '0xmymaintransactionhashfromlog',
    })
    expect(allowedVestedTargetUpdateds[1]).toMatchObject({
      id: auxTestLog.id,
      block: auxTestLog.block.height,
      ...decodedAuxTestLog,
      txnHash: '0xmyauxtransactionhashfromlog',
    })

    const dbTransfers = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('network_controllers_allowed_vested_target_updated', 't')
      .addOrderBy('id::int', 'ASC')
      .getRawMany()

    expect(dbTransfers).toHaveLength(2)
    expect(dbTransfers[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      txn_hash: '0xmymaintransactionhashfromlog',
      target: decodedMainTestLog.target,
      is_allowed: decodedMainTestLog.isAllowed,
    })
    expect(dbTransfers[1]).toMatchObject({
      id: auxTestLog.id,
      block: auxTestLog.block.height,
      txn_hash: '0xmyauxtransactionhashfromlog',
      target: decodedAuxTestLog.target,
      is_allowed: decodedAuxTestLog.isAllowed,
    })
  })
})
