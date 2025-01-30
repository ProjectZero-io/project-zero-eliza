import type {Plugin} from "@elizaos/core";
import {UniswapWebhookService} from "./services/uniswap-webhook.service.ts";
import {latestV2PairsAction} from "./actions/latest-v2-pairs.action.ts";
import {latestV3PoolsAction} from "./actions/latest-v3-pools.action.ts";
import {latestUniswapV3PoolsProvider} from "./providers/latest-v3-pools.provider.ts";
import {latestUniswapV2PairsProvider} from "./providers/latest-v2-pairs.provider.ts";
import {activeUniswapV2PairsProvider} from "./providers/active-v2-pairs.provider.ts";
import {activeV2PairsAction} from "./actions/active-v2-pairs.action.ts";
import {activeUniswapV3PoolsProvider} from "./providers/active-v3-pools.provider.ts";
import {activeV3PoolsAction} from "./actions/active-v3-pools.action.ts";

export const uniswapMonitorPlugin: Plugin = {
	name: "Uniswap Monitor",
	description: "Project Zero AI Agent. Monitors Uniswap pools for high-potential trading opportunities",
	actions: [
		latestV2PairsAction,
		latestV3PoolsAction,
		activeV2PairsAction,
		activeV3PoolsAction
	],
	providers: [
		latestUniswapV2PairsProvider,
		latestUniswapV3PoolsProvider,
		activeUniswapV2PairsProvider,
		activeUniswapV3PoolsProvider,
	],
	services: [new UniswapWebhookService()],
};
