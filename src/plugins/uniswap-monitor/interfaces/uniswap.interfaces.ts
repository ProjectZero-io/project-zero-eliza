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
}

export interface UniswapBlockData {
	number: number;
	hash: string;
	uniswapV2: {
		pairCreations: PairCreation[];
		swaps: SwapV2[];
	};
	uniswapV3: {
		poolCreations: PoolCreation[];
		swaps: SwapV3[];
	};
}
