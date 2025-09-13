import { Store } from '@subsquid/typeorm-store'
import {
  setupTestDatabase,
  type TestDatabase,
  createDefaultLog,
  miniHash
} from '../../testing'

import { handleLiquidationCalls } from './liquidationCall'

describe('handleLiquidationCalls integration', () => {
  let db: TestDatabase
  let store: Store

  beforeAll(async () => {
    db = await setupTestDatabase()
    store = new Store(() => db.dataSource.manager)
  })

  afterAll(async () => {
    await db.cleanup()
  })

  it('should process LiquidationCall events and save them to the database', async () => {
    let lognum = 0

    const decodedMainTestLog = {
      collateralAsset: '0xcollateralAssetMain',
      debtAsset: '0xdebtAssetMain',
      user: '0xuserMain',
      debtToCover: BigInt(miniHash('main' + 'debtToCover')),
      liquidatedCollateralAmount: BigInt(miniHash('main' + 'liquidatedCollateralAmount')),
      liquidator: '0xliquidatorMain',
      receiveAToken: true,
    }
    const mainTestLog = {
      contract: {
        name: 'AavePool',
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

    // Minimal ProcessorContext mock
    const ctx = { store } as any
    const { liquidationCalls } = await handleLiquidationCalls(
      'ethereum-mainnet',
      ctx,
      [mainTestLog],
      { transfers: [],  }
    )

    expect(liquidationCalls).toHaveLength(1)
    expect(liquidationCalls[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      ...decodedMainTestLog,
      txnHash: '0xmymaintransactionhashfromlog',
    })

    const dbTransfers = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('aave_pool_liquidation_call', 't')
      .addOrderBy('id::int', 'ASC')
      .getRawMany()

    expect(dbTransfers).toHaveLength(1)
    expect(dbTransfers[0]).toMatchObject({
      id: mainTestLog.id,
      block: mainTestLog.block.height,
      txn_hash: '0xmymaintransactionhashfromlog',
      collateral_asset: decodedMainTestLog.collateralAsset,
      debt_asset: decodedMainTestLog.debtAsset,
      user: decodedMainTestLog.user,
      debt_to_cover: decodedMainTestLog.debtToCover.toString(),
      liquidated_collateral_amount: decodedMainTestLog.liquidatedCollateralAmount.toString(),
      liquidator: decodedMainTestLog.liquidator,
      receive_a_token: decodedMainTestLog.receiveAToken,
    })
  })
})
