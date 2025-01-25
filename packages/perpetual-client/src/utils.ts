import {
  ClientCancelOrder,
  ClientOpenOrder,
  ClientPlaceOrder,
} from './types';
import {
  EngineCancelOrder,
  EngineOpenOrder,
  EnginePlaceOrder,
} from './engine';
import {
  DECIMALS,
  SELF_TRADE_BEHAVIORS,
  SelfTradeBehavior,
  TIME_IN_FORCES,
} from '@foundation-network/core/src';
import { randomInt } from 'node:crypto';
import { TimeInForce } from '@foundation-network/core';
import {parseUnits} from 'viem';

export function generateOrderNonce(num?: number): string {
  const now: number = new Date().getTime();
  const timeout: number = 10000; // 10s
  const expireTime: number = now + timeout;
  const sub: number = num || randomInt(0, 1000);

  return ((BigInt(expireTime) << BigInt(20)) | BigInt(sub)).toString();
}

export function encodeExpiration(params: EnginePlaceOrder): bigint {
  const isMarket = params.is_market_order ? 1n : 0n;
  const reduceOnly = params.reduce_only ? 1n : 0n;
  const tif = BigInt(TIME_IN_FORCES.indexOf(params.time_in_force));
  const stb = BigInt(SELF_TRADE_BEHAVIORS.indexOf(params.self_trade_behavior));

  return (
    (tif << 62n) |
    (reduceOnly << 61n) |
    (isMarket << 60n) |
    (stb << 58n) |
    BigInt(params.expires_at || 0)
  );
}

export function encodeTriggerCondition(params: EnginePlaceOrder): bigint {
  if (!params.trigger_condition) return 0n;
  const priceType: number = params.trigger_condition.mark_price ? 0 : 1;
  const triggerPrice = !priceType
    ? params.trigger_condition.mark_price
    : params.trigger_condition.last_price;
  const direction = triggerPrice?.above ? 1 : 0;
  const stopPrice = direction ? triggerPrice?.above : triggerPrice?.below;
  if (!stopPrice) {
    return 0n;
  }
  return (
    (BigInt(priceType) << 125n) |
    (BigInt(direction) << 124n) |
    parseUnits(stopPrice, DECIMALS)
  );
}


export function buildEnginePlaceOrder(
  params: ClientPlaceOrder,
): EnginePlaceOrder {
  const nonce: string = params.nonce || generateOrderNonce();
  const isMarketOrder: boolean = params.isMarketOrder || false;
  const reduceOnly: boolean = params.reduceOnly || false;
  const timeInForce: TimeInForce = params.timeInForce || 'default';
  const selfTradeBehavior: SelfTradeBehavior =
    params.selfTradeBehavior || 'cancel_provide';

  return {
    account_id: params.accountId,
    market_id: params.marketId,
    side: params.side,
    price: params.price,
    amount: params.amount,
    trigger_condition: params.triggerCondition,
    time_in_force: timeInForce,
    reduce_only: reduceOnly,
    is_market_order: isMarketOrder,
    self_trade_behavior: selfTradeBehavior,
    expires_at: params.expiresAt,
    nonce: nonce,
  };
}

export function buildEngineCancelOrder(
  params: ClientCancelOrder,
): EngineCancelOrder {
  const nonce: string = params.nonce || generateOrderNonce();

  return {
    account_id: params.accountId,
    market_id: params.marketId,
    order_id: params.orderId,
    nonce: nonce,
  };
}

export function buildClientOpenOrder(order: EngineOpenOrder): ClientOpenOrder {
  return {
    accountId: order.account_id,
    amount: order.amount,
    createTimestamp: order.create_timestamp,
    expiration: order.expiration,
    hasDependency: order.has_dependency,
    isTriggered: order.is_triggered,
    marketId: order.market_id,
    matchedBaseAmount: order.matched_base_amount,
    matchedQuoteAmount: order.matched_quote_amount,
    nonce: order.nonce,
    orderId: order.order_id,
    price: order.price,
    quoteFee: order.quote_fee,
    side: order.side,
    tag: order.tag,
    triggerCondition: order.trigger_condition,
  };
}
