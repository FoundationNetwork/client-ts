import { test } from 'vitest';
import { FoundationPerpClient } from './index';
import { PrivateKeyAccount, privateKeyToAccount } from 'viem/accounts';
import {
  ClientAccount,
  ClientMarketConfig,
  ClientMarketPrice,
  ClientMarketState,
  ClientOpenOrder,
  ClientOrderbook,
  ClientPlaceOrder,
} from './types';
import { TESTNET_RPC_URL } from './engine';
import { buildAccountId, ProductType } from '@foundation-network/core';
import { formatUnits, Hash, parseUnits } from 'viem';
import { DECIMALS } from '@foundation-network/core/src';

test('test', async () => {
  const signer: PrivateKeyAccount = privateKeyToAccount(
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  );
  const accountId: Hash = buildAccountId(
    signer.address,
    ProductType.Perpetual,
    1,
    0,
  );
  const client: FoundationPerpClient = new FoundationPerpClient(
    TESTNET_RPC_URL,
  );

  // get market config
  const marketConfigs: ClientMarketConfig[] = await client.getMarketConfigs();
  console.log(marketConfigs);

  const now = Date.now();
  for (const marketConfig of marketConfigs) {
    if (
      !marketConfig.isOpen ||
      now < marketConfig.availableFrom ||
      (marketConfig.unavailableAfter && now >= marketConfig.unavailableAfter)
    )
      continue;

    // get market price
    const marketPrice: ClientMarketPrice = await client.getMarketPrice(
      marketConfig.id,
    );
    console.log(marketPrice);

    const indexPrice = parseUnits(marketPrice.indexPrice, DECIMALS);
    const tickSize = parseUnits(marketConfig.tickSize, DECIMALS);
    const amount = formatUnits(
      parseUnits(marketConfig.stepSize, DECIMALS) * 100n,
      DECIMALS,
    );
    const sellPrice = (indexPrice / tickSize) * tickSize + tickSize;
    const buyPrice = (indexPrice / tickSize) * tickSize;

    const orders: ClientPlaceOrder[] = [
      // place order with trigger condition
      {
        accountId,
        marketId: marketConfig.id,
        side: 'ask',
        price: formatUnits(sellPrice, DECIMALS),
        amount,
        triggerCondition: {
          last_price: {
            below: formatUnits(sellPrice - sellPrice / 10n, DECIMALS),
          },
        },
      },
      // place order without trigger condition
      {
        accountId,
        marketId: marketConfig.id,
        side: 'bid',
        price: formatUnits(buyPrice, DECIMALS),
        amount,
      },
    ];
    console.log(orders);

    // place order
    const placedOrderIds: number[] = await Promise.all(
      orders.map((order) => client.placeOrder(signer, order)),
    );
    console.log(placedOrderIds);

    // get all order
    const openOrders: ClientOpenOrder[] = await client.getOpenOrdersByAccount(
      marketConfig.id,
      accountId,
    );
    console.log(openOrders);

    // get orderbook
    const orderbook: ClientOrderbook | null = await client.getOrderbook(
      marketConfig.id,
    );
    console.log(orderbook);

    for (const placedOrderId of placedOrderIds) {
      // get open order by id
      const openOrder: ClientOpenOrder | null = await client.getOpenOrderById(
        marketConfig.id,
        placedOrderId,
      );
      console.log(openOrder);

      // cancel order
      const canceledOrderId: number = await client.cancelOrder(signer, {
        accountId,
        marketId: marketConfig.id,
        orderId: placedOrderId.toString(),
      });
      console.log(canceledOrderId);
    }
  }

  // get market state
  const marketStates: ClientMarketState[] = await client.getMarketStates();
  console.log(marketStates);

  // get account (balance & position)
  const account: ClientAccount = await client.getAccount(accountId);
  console.log(account);
});
