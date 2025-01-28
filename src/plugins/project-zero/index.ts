import type {Plugin} from "@elizaos/core";
import {UniswapWebhookService} from "./services/uniswap-webhook.service.ts";
import {latestUniswapV2PairsProvider} from "./providers/latest-v2-pairs.provider.ts";
import {latestV2PairsAction} from "./actions/latest-v2-pairs.action.ts";
import {latestUniswapV3PoolsProvider} from "./providers/latest-v3-pools.provider.ts";
import {latestV3PoolsAction} from "./actions/latest-v3-pools.action.ts";

export const projectZeroPlugin: Plugin = {
	name: "Project Zero",
	description: "Project Zero AI Agent. Monitors Uniswap pools for high-potential trading opportunities",
	// evaluators: [factEvaluator],
	actions: [latestV2PairsAction, latestV3PoolsAction],
	providers: [latestUniswapV2PairsProvider, latestUniswapV3PoolsProvider],
	services: [new UniswapWebhookService()],
};
