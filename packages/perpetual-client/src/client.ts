import { Address, Hash, type LocalAccount } from 'viem';
import {
  buildClientOpenOrder,
  buildEngineCancelOrder,
  buildEnginePlaceOrder,
} from './utils';
import type { SmartAccount } from 'viem/account-abstraction';
import {
  ClientCancelOrder,
  ClientMarketState,
  ClientMarketConfig,
  ClientOpenOrder,
  ClientPlaceOrder,

  ClientOrderbook,
  ClientMarketPrice,
  ClientAccount,
  AddTradingKey,
  ClientPosition,
} from './types';
import {
  FoundationPerpEngine,
  EngineCancelOrder,
  EngineMarketState,
  EngineMarketConfig,
  EngineOpenOrder,
  EnginePlaceOrder,
  EngineOrderbook,
  EngineMarketPrice,
  EngineAccount,
} from './engine';

export class FoundationPerpClient {
  private engine: FoundationPerpEngine;

  constructor(rpc: string) {
    this.engine = new FoundationPerpEngine(rpc);
  }

  async getUserNonce(address: Address): Promise<number> {
    return this.engine.getUserNonce(address);
  }

  async addTradingKey(
    signer: LocalAccount | SmartAccount,
    accountId: Hash,
  ): Promise<void> {
    const nonce: number = await this.getUserNonce(signer.address);

    const params: AddTradingKey = {
      accountId,
      signer: signer.address,
      nonce,
    };

    const signature: Hash = await this.engine.signAddTradingKey(
      signer,
      params,
    );

    await this.engine.addTradingKey(params, signature);
  }

  async getTradingKey(accountId: Hash): Promise<Address | null> {
    return this.engine.getTradingKey(accountId);
  }

  async placeOrder(
    signer: LocalAccount | SmartAccount,
    params: ClientPlaceOrder,
  ): Promise<number> {
    const payload: EnginePlaceOrder = buildEnginePlaceOrder(params);

    const signature: Hash = await this.engine.signPlaceOrder(
      signer,
      payload,
    );

    return this.engine.placeOrder(payload, signature);
  }

  async cancelOrder(
    signer: LocalAccount | SmartAccount,
    params: ClientCancelOrder,
  ): Promise<number> {
    const payload: EngineCancelOrder = buildEngineCancelOrder(params);

    const signature: Hash = await this.engine.signCancelOrder(
      signer,
      payload,
    );

    return this.engine.cancelOrder(payload, signature);
  }

  async getOpenOrderById(
    marketId: number,
    orderId: number,
  ): Promise<ClientOpenOrder | null> {
    const order: EngineOpenOrder | null = await this.engine.getOpenOrderById(
      marketId,
      orderId,
    );
    if (!order) return null;

    return buildClientOpenOrder(order);
  }

  async getOpenOrdersByAccount(
    marketId: number,
    accountId: Hash,
  ): Promise<ClientOpenOrder[]> {
    const orders: EngineOpenOrder[] = await this.engine.getOpenOrdersByAccount(
      marketId,
      accountId,
    );

    return orders.map((order) => buildClientOpenOrder(order));
  }

  async getAccount(accountId: Hash): Promise<ClientAccount> {
    const account: EngineAccount = await this.engine.getAccount(accountId);

    return {
      positions: Object.entries(account.positions).map(
        ([marketId, position]): ClientPosition => {
          return {
            marketId: +marketId,
            baseAmount: position.base_amount,
            frozenInAskOrder: position.frozen_in_ask_order,
            frozenInBidOrder: position.frozen_in_bid_order,
            lastCumulativeFunding: position.last_cumulative_funding,
            quoteAmount: position.quote_amount,
            unsettledPnl: position.unsettled_pnl,
          };
        },
      ),
      collateral: account.collateral,
      isInLiquidationQueue: account.is_in_liquidation_queue,
    };
  }

  async getMarketConfigs(): Promise<ClientMarketConfig[]> {
    const markets: EngineMarketConfig[] = await this.engine.getMarketConfigs();

    return markets.map((market) => ({
      id: market.id,
      ticker: market.ticker,
      minVolume: market.min_volume,
      tickSize: market.tick_size,
      stepSize: market.step_size,
      initialMargin: market.initial_margin,
      maintenanceMargin: market.maintenance_margin,
      isOpen: market.is_open,
      nextOpen: market.next_open,
      nextClose: market.next_close,
      insuranceId: market.insurance_id,
      priceCap: market.price_cap,
      priceFloor: market.price_floor,
      availableFrom: market.available_from,
      unavailableAfter: market.unavailable_after,
    }));
  }

  async getMarketStates(): Promise<ClientMarketState[]> {
    const markets: EngineMarketState[] = await this.engine.getMarketStates();

    return markets.map((market) => ({
      id: market.id,
      openInterest: market.open_interest,
      cumulativeFunding: market.cumulative_funding,
      availableSettle: market.available_settle,
      nextFundingRate: market.next_funding_rate,
    }));
  }

  async getMarketPrice(marketId: number): Promise<ClientMarketPrice> {
    const price: EngineMarketPrice = await this.engine.getMarketPrice(marketId);

    return {
      indexPrice: price.index_price,
      markPrice: price.mark_price,
      lastPrice: price.last_price,
    };
  }

  async getOrderbook(
    marketId: number,
    take: number = 1000,
  ): Promise<ClientOrderbook | null> {
    const orderbook: EngineOrderbook | null = await this.engine.getOrderbook(
      marketId,
      take,
    );
    if (!orderbook) return null;

    return {
      marketId: orderbook.market_id,
      asks: orderbook.asks,
      bids: orderbook.bids,
    };
  }
}
