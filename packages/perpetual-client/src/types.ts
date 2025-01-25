import { Address, Hash } from 'viem';
import { Side, TimeInForce } from '@foundation-network/core';
import {SelfTradeBehavior, TriggerCondition} from '@foundation-network/core/src';

export type Config = {
  chain_id: number;
  endpoint: Address;
  offchain_book: Address;
};

export type FeeTier = {
  maker_fee: string;
  taker_fee: string;
};

export type ClientPlaceOrder = {
  accountId: Hash;
  marketId: number;
  side: Side;
  price: string;
  amount: string;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  isMarketOrder?: boolean;
  selfTradeBehavior?: SelfTradeBehavior;
  nonce?: string;
  expiresAt?: number;
  verifyingAddr?: Address;
  triggerCondition?: TriggerCondition;
};

export type ClientCancelOrder = {
  accountId: Hash;
  marketId: number;
  orderId: string;
  nonce?: string;
  verifyingAddr?: Address;
};

export type AddTradingKey = {
  accountId: Hash;
  signer: Address;
  nonce: number;
};

export type OrderTag = 'limit' | 'market' | 'stop_loss' | 'take_profit';

export type OrderSource =
  | 'Trade'
  | 'Liquidate'
  | 'InsuranceFundCover'
  | 'Deleverage'
  | 'Delist';

export type OrderExpiration = {
  time_in_force: TimeInForce;
  reduce_only: boolean;
  self_trade_behavior: SelfTradeBehavior;
  expires_at: number | null;
  is_market_order: boolean;
};

export type ClientOpenOrder = {
  orderId: number;
  accountId: Hash;
  marketId: number;
  side: Side;
  createTimestamp: number;
  amount: string;
  price: string;
  matchedQuoteAmount: string;
  matchedBaseAmount: string;
  quoteFee: string;
  nonce: number;
  expiration: OrderExpiration;
  isTriggered: boolean;
  hasDependency: boolean;
  tag: OrderTag;
  triggerCondition?: TriggerCondition;
};

export type ClientMarketConfig = {
  id: number;
  ticker: string;
  minVolume: string;
  tickSize: string;
  stepSize: string;
  initialMargin: string;
  maintenanceMargin: string;
  isOpen: boolean;
  nextOpen: number | null;
  nextClose: number | null;
  insuranceId: Hash | null;
  priceCap: string;
  priceFloor: string;
  availableFrom: number;
  unavailableAfter: number | null;
};

export type ClientMarketState = {
  id: number;
  openInterest: string;
  cumulativeFunding: string;
  availableSettle: string;
  nextFundingRate: string;
};

export type OrderbookItem = [
  price: string,
  amount: string,
  cumulativeAmount: string,
];

export type ClientOrderbook = {
  marketId: number;
  asks: OrderbookItem[];
  bids: OrderbookItem[];
};

export type ClientMarketPrice = {
  indexPrice: string;
  markPrice: string;
  lastPrice: string | null;
};

export type ClientPosition = {
  marketId: number;
  baseAmount: string;
  quoteAmount: string;
  lastCumulativeFunding: string;
  frozenInBidOrder: string;
  frozenInAskOrder: string;
  unsettledPnl: string;
};

export type ClientAccount = {
  positions: ClientPosition[];
  collateral: string;
  isInLiquidationQueue: boolean;
};
