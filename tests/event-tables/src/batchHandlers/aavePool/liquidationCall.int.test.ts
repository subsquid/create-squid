import { Store } from '@subsquid/typeorm-store'
import { setupTestDatabase, type TestDatabase } from '../../testing/testDatabase'
import { createDefaultLog } from '../../testing/defaultObjects'

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
    const decodedMainTestLog = {
      collateralAsset: '0xcollateralAssetMain',
      debtAsset: '0xdebtAssetMain',
      user: '0xuserMain',
      debtToCover: BigInt(1000000000),
      liquidatedCollateralAmount: BigInt(2000000000000000000000),
      liquidator: '0xliqudatorMain',
      receiveAToken: true
    }
    const mainTestLog = {
      contract: {
        name: 'AavePool',
        instanceName: 'main',
        instanceAddress: '0xmain'
      },
      decoded: decodedMainTestLog,
      ...createDefaultLog()
    }
    mainTestLog.id = 'myliquidationcalllogid'
    mainTestLog.block.height = 11362580
    mainTestLog.transactionHash = '0xmyliquidationcalltransactionhash'

    // Minimal ProcessorContext mock
    const ctx = { store } as any
    const { liquidationCalls } = await handleLiquidationCalls(
      'ethereum-mainnet',
      ctx,
      [mainTestLog],
      { transfers: [] }
    )

    expect(liquidationCalls).toHaveLength(1)
    expect(liquidationCalls[0]).toMatchObject({
      id: 'myliquidationcalllogid',
      block: 11362580,
      ...decodedMainTestLog,
      txnHash: '0xmyliquidationcalltransactionhash',
    })

    const dbLiquidationCalls = await db.dataSource
      .createQueryBuilder()
      .select('*')
      .from('aave_pool_main_liquidation_call', 'l')
      .getRawMany()

    expect(dbLiquidationCalls).toHaveLength(1)
    expect(dbLiquidationCalls[0]).toMatchObject({
      id: 'myliquidationcalllogid',
      block: 11362580,
      txn_hash: '0xmyliquidationcalltransactionhash',
      collateral_asset: decodedMainTestLog.collateralAsset,
      debt_asset: decodedMainTestLog.debtAsset,
      user: decodedMainTestLog.user,
      debt_to_cover: decodedMainTestLog.debtToCover.toString(),
      liquidated_collateral_amount: decodedMainTestLog.liquidatedCollateralAmount.toString(),
      liquidator: decodedMainTestLog.liquidator,
      receive_a_token: decodedMainTestLog.receiveAToken
    })
  })
})
