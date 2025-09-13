import { Store } from '@subsquid/typeorm-store'
import {
  setupTestDatabase,
  type TestDatabase,
  createDefaultLog,
  miniHash
} from '../../testing'

import { handleTransfers } from './transfer'

describe('handleTransfers integration', () => {
  let db: TestDatabase
  let store: Store

  beforeAll(async () => {
    db = await setupTestDatabase()
    store = new Store(() => db.dataSource.manager)
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('should process Transfer events and save them to the database', async () => {
    let lognum = 0

    const decodedUsdcTestLog = {
      from: '0xfromusdc',
      to: '0xtousdc',
      value: BigInt(miniHash('usdc' + 'value'))
    }
    const usdcTestLog = {
      contract: {
        name: 'Tokens',
        instanceName: 'usdc',
        instanceAddress: '0xusdc',
      },
      decoded: decodedUsdcTestLog,
      ...createDefaultLog(),
    }
    usdcTestLog.id = lognum.toString()
    lognum += 1
    usdcTestLog.block.height = miniHash('usdc' + 'height')
    usdcTestLog.transactionHash = '0xmyusdctransactionhashfromlog'

    const decodedSqdTestLog = {
      from: '0xfromsqd',
      to: '0xtosqd',
      value: BigInt(miniHash('sqd' + 'value')),
    }
    const sqdTestLog = {
      contract: {
        name: 'Tokens',
        instanceName: 'sqd',
        instanceAddress: '0xsqd',
      },
      decoded: decodedSqdTestLog,
      ...createDefaultLog(),
    }
    sqdTestLog.id = lognum.toString()
    lognum += 1
    sqdTestLog.block.height = miniHash('sqd' + 'height')
    sqdTestLog.transactionHash = '0xmysqdtransactionhashfromlog'

    // Minimal ProcessorContext mock
    const ctx = { store } as any
    const { transfers } = await handleTransfers(
      'ethereum-mainnet',
      ctx,
      [usdcTestLog, sqdTestLog],
      {}
    )

    expect(transfers).toHaveLength(2)
    expect(transfers[0]).toMatchObject({
      id: usdcTestLog.id,
      block: usdcTestLog.block.height,
      ...decodedUsdcTestLog,
      txnHash: '0xmyusdctransactionhashfromlog',
    })
    expect(transfers[1]).toMatchObject({
      id: sqdTestLog.id,
      block: sqdTestLog.block.height,
      ...decodedSqdTestLog,
      txnHash: '0xmysqdtransactionhashfromlog',
    })

    const dbTransfers = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('tokens_transfer', 't')
      .addOrderBy('id::int', 'ASC')
      .getRawMany()

    expect(dbTransfers).toHaveLength(2)
    expect(dbTransfers[0]).toMatchObject({
      id: usdcTestLog.id,
      block: usdcTestLog.block.height,
      txn_hash: '0xmyusdctransactionhashfromlog',
      from: decodedUsdcTestLog.from,
      to: decodedUsdcTestLog.to,
      value: decodedUsdcTestLog.value.toString(),
    })
    expect(dbTransfers[1]).toMatchObject({
      id: sqdTestLog.id,
      block: sqdTestLog.block.height,
      txn_hash: '0xmysqdtransactionhashfromlog',
      from: decodedSqdTestLog.from,
      to: decodedSqdTestLog.to,
      value: decodedSqdTestLog.value.toString(),
    })
  })
})
