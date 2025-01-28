import type {Plugin} from "@elizaos/core";
import {helloWorldAction} from "./actions";
import {UniswapWebhookService} from "./services/uniswap-webhook.service.ts";

export const projectZeroPlugin: Plugin = {
	name: "Project Zero",
	description: "Project Zero AI Agent. Monitors Uniswap pools for high-potential trading opportunities",
	actions: [helloWorldAction],
	// evaluators: [factEvaluator],
	// providers: [timeProvider],
	services: [new UniswapWebhookService()],
};
