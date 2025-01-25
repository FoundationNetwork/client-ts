import Client, {
  HTTPTransport,
  RequestManager,
  WebSocketTransport,
} from '@open-rpc/client-js';
import {
  Config,
  AddTradingKey, OrderExpiration, OrderSource, FeeTier, OrderTag, OrderbookItem,
} from './types';
import {type Address, Hash, type LocalAccount, parseUnits} from 'viem';
import type { SmartAccount } from 'viem/account-abstraction';
import {encodeExpiration, encodeTriggerCondition} from './utils';
import {
  DECIMALS,
  OrderStatus,
  SelfTradeBehavior,
  Side,
  TimeInForce,
  TriggerCondition
} from '@foundation-network/core/src';

export const EIP712_DOMAIN = {
  name: 'FOUNDATION',
  version: '0.1.0',
} as const;

export const TESTNET_RPC_URL =
  'https://testnet-rpc.foundation.network/perpetual';

export class FoundationPerpEngine {
  private client: Client;
  private config: Config | undefined;

  constructor(rpc: string) {
    const transport = rpc.startsWith('ws')
      ? new WebSocketTransport(rpc)
      : new HTTPTransport(rpc);

    this.client = new Client(new RequestManager([transport]));
  }

  async getUserNonce(address: Address): Promise<number> {
    return this.client.request({
      method: 'core_get_user_nonce',
      params: [address],
    });
  }

  async addTradingKey(params: AddTradingKey, signature: Hash): Promise<void> {
    await this.client.request({
      method: 'ob_add_trading_key',
      params: [
        {
          account_id: params.accountId,
          signer: params.signer,
        },
        params.nonce,
        signature,
      ],
    });
  }

  async getTradingKey(accountId: Hash): Promise<Address | null> {
    return this.client.request({
      method: 'ob_get_trading_key',
      params: [accountId],
    });
  }

  async placeOrder(params: EnginePlaceOrder, signature: Hash): Promise<number> {
    return this.client.request({
      method: 'ob_place_limit',
      params: [params, signature],
    });
  }

  async cancelOrder(
    params: EngineCancelOrder,
    signature: Hash,
  ): Promise<number> {
    return this.client.request({
      method: 'ob_cancel',
      params: [params, signature],
    });
  }

  async getOpenOrderById(
    marketId: number,
    orderId: number,
  ): Promise<EngineOpenOrder | null> {
    return this.client.request({
      method: 'ob_query_order',
      params: [marketId, orderId],
    });
  }

  async getOpenOrdersByAccount(
    marketId: number,
    accountId: Hash,
  ): Promise<EngineOpenOrder[]> {
    return this.client.request({
      method: 'ob_query_user_orders',
      params: [marketId, accountId],
    });
  }

  async getAccount(accountId: Hash): Promise<EngineAccount> {
    return this.client.request({
      method: 'core_query_account',
      params: [accountId],
    });
  }

  async getMarketConfigs(): Promise<EngineMarketConfig[]> {
    return this.client.request({
      method: 'ob_query_open_markets',
      params: [],
    });
  }

  async getMarketStates(): Promise<EngineMarketState[]> {
    return this.client.request({
      method: 'ob_query_markets_state',
      params: [],
    });
  }

  async getMarketPrice(marketId: number): Promise<EngineMarketPrice> {
    return this.client.request({
      method: 'core_query_price',
      params: [marketId],
    });
  }

  async getOrderbook(
    marketId: number,
    take: number,
  ): Promise<EngineOrderbook | null> {
    return this.client.request({
      method: 'ob_query_depth',
      params: [marketId, take],
    });
  }

  async updateConfig(): Promise<void> {
    this.config = await this.client.request({
      method: 'core_get_trading_config',
      params: [],
    });
  }

  async signPlaceOrder(
    signer: LocalAccount | SmartAccount,
    params: EnginePlaceOrder,
  ): Promise<Hash> {
    const config = await this.getConfig();

    return signer.signTypedData({
      domain: {
        ...EIP712_DOMAIN,
        chainId: config.chain_id,
        verifyingContract: config.offchain_book,
      },
      types: {
        Order: [
          { name: 'subaccount', type: 'bytes32' },
          { name: 'market', type: 'uint64' },
          { name: 'price', type: 'int128' },
          { name: 'amount', type: 'int128' },
          { name: 'nonce', type: 'uint64' },
          { name: 'expiration', type: 'uint64' },
          { name: 'triggerCondition', type: 'uint128' },
        ],
      },
      primaryType: 'Order',
      message: {
        subaccount: params.account_id,
        market: BigInt(params.market_id),
        price: parseUnits(params.price, DECIMALS),
        amount: parseUnits(
          params.side === 'bid' ? params.amount : `-${params.amount}`,
          DECIMALS,
        ),
        nonce: BigInt(params.nonce),
        expiration: encodeExpiration(params),
        triggerCondition: encodeTriggerCondition(params),
      },
    });
  }

  async signCancelOrder(
    signer: LocalAccount | SmartAccount,
    params: EngineCancelOrder,
  ): Promise<Hash> {
    const config = await this.getConfig();

    return signer.signTypedData({
      domain: {
        ...EIP712_DOMAIN,
        chainId: config.chain_id,
        verifyingContract: config.offchain_book,
      },
      types: {
        Cancel: [
          { name: 'subaccount', type: 'bytes32' },
          { name: 'market', type: 'uint64' },
          { name: 'nonce', type: 'uint64' },
          { name: 'orderId', type: 'uint64' },
        ],
      },
      primaryType: 'Cancel',
      message: {
        subaccount: params.account_id,
        market: BigInt(params.market_id),
        nonce: BigInt(params.nonce),
        orderId: BigInt(params.order_id),
      },
    });
  }

  async signAddTradingKey(
    signer: LocalAccount | SmartAccount,
    params: AddTradingKey,
  ): Promise<Hash> {
    const config = await this.getConfig()
    return signer.signTypedData({
      domain: {
        ...EIP712_DOMAIN,
        chainId: config.chain_id,
        verifyingContract: config.endpoint,
      },
      types: {
        LinkSigner: [
          { name: 'sender', type: 'bytes32' },
          { name: 'signer', type: 'address' },
          { name: 'nonce', type: 'uint64' },
        ],
      },
      primaryType: 'LinkSigner',
      message: {
        sender: params.accountId,
        signer: params.signer,
        nonce: BigInt(params.nonce),
      },
    });
  }

  async getConfig(): Promise<Config> {
    if (!this.config) {
      await this.updateConfig();
    }

    return this.config as Config;
  }
}

export type EnginePlaceOrder = {
  account_id: Hash;
  market_id: number;
  side: Side;
  price: string;
  amount: string;
  time_in_force: TimeInForce;
  reduce_only: boolean;
  is_market_order: boolean;
  self_trade_behavior: SelfTradeBehavior;
  nonce: string;
  expires_at?: number;
  trigger_condition?: TriggerCondition;
};

export type EngineCancelOrder = {
  account_id: Hash;
  market_id: number;
  order_id: string;
  nonce: string;
};

export type EngineOpenOrder = {
  order_id: number;
  account_id: Hash;
  market_id: number;
  side: Side;
  create_timestamp: number;
  amount: string;
  price: string;
  status: OrderStatus;
  matched_quote_amount: string;
  matched_base_amount: string;
  quote_fee: string;
  nonce: number;
  expiration: OrderExpiration;
  is_triggered: boolean;
  signature: Hash;
  signer: Address;
  has_dependency: boolean;
  source: OrderSource;
  system_fee_tier: FeeTier;
  broker_fee_tier: FeeTier;
  tag: OrderTag;
  trigger_condition?: TriggerCondition;
};

export type EngineMarketState = {
  id: number;
  open_interest: string;
  cumulative_funding: string;
  available_settle: string;
  next_funding_rate: string;
  mark_price: string;
};

export type EngineMarketConfig = {
  id: number;
  ticker: string;
  min_volume: string;
  tick_size: string;
  step_size: string;
  initial_margin: string;
  maintenance_margin: string;
  is_open: boolean;
  next_open: number | null;
  next_close: number | null;
  insurance_id: Hash | null;
  price_cap: string;
  price_floor: string;
  available_from: number;
  unavailable_after: number | null;
  pyth_id: string;
};

export type EngineOrderbook = {
  market_id: number;
  asks: OrderbookItem[];
  bids: OrderbookItem[];
};

export type EngineMarketPrice = {
  index_price: string;
  mark_price: string;
  last_price: string | null;
  index_price_time: number;
};

export type EnginePosition = {
  base_amount: string;
  quote_amount: string;
  last_cumulative_funding: string;
  frozen_in_bid_order: string;
  frozen_in_ask_order: string;
  unsettled_pnl: string;
  is_settle_pending: string;
};

export type EngineAccount = {
  positions: { [marketId: string]: EnginePosition };
  collateral: string;
  is_in_liquidation_queue: boolean;
};