import type {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";

export interface PairCreation {
	pair: string;
	token0: string;
	token1: string;
	blockNumber: number;
	blockTimestamp: number;
	transactionHash: string;
}

export interface PoolCreation {
	pool: string;
	token0: string;
	token1: string;
	fee: number;
	tickSpacing: number;
	blockNumber: number;
	blockTimestamp: number;
	transactionHash: string;
}

export interface SwapV2 {
	pair: string;
	sender: string;
	to: string;
	amount0In: string;
	amount1In: string;
	amount0Out: string;
	amount1Out: string;
	blockNumber: number;
	blockTimestamp: number;
	transactionHash: string;
	logIndex: number;
}

export interface SwapV3 {
	pool: string;
	sender: string;
	recipient: string;
	amount0: string;
	amount1: string;
	sqrtPriceX96: string;
	liquidity: string;
	tick: number;
	blockNumber: number;
	blockTimestamp: number;
	transactionHash: string;
	logIndex: number;
}

export enum Blockchain {
	ETHEREUM = 'ethereum',
	BASE = 'base',
}

export interface UniswapBlockData {
	number: number;
	hash: string;
	blockchain: Blockchain;
	uniswapV2: {
		pairCreations: PairCreation[];
		swaps: SwapV2[];
	};
	uniswapV3: {
		poolCreations: PoolCreation[];
		swaps: SwapV3[];
	};
}

export interface ExtendedProvider<T> extends Provider {
	get: (runtime: IAgentRuntime, message: Memory, state?: State, blockchain?: Blockchain) => Promise<T[]>;
}

export interface PairActivity {
	pair_address: string;
	token0: string;
	token1: string;
	total_swaps: number;
	buy_count: number;
	sell_count: number;
	token0_volume: string;
	token1_volume: string;
}

export interface PoolActivity {
	pool_address: string;
	token0: string;
	token1: string;
	fee: number;
	total_swaps: number;
	buy_count: number;
	sell_count: number;
	token0_volume: string;
	token1_volume: string;
}
