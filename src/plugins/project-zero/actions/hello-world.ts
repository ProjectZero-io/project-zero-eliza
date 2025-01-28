import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State,} from "@elizaos/core";

export const helloWorldAction: Action = {
	name: "HELLO_WORLD",
	similes: ["HELLO"],
	validate: async (_runtime: IAgentRuntime, _message: Memory) => {
		return true;
	},
	description: "Make a cool Hello World ASCII art.",
	handler: async (
		_runtime: IAgentRuntime,
		_message: Memory,
		_state: State,
		_options: { [key: string]: unknown },
		_callback: HandlerCallback,
	): Promise<boolean> => {
		const helloWorld = `
        THIS IS DEFINITELY WORKS!!!!!!!!!!!!!!

  _   _      _ _         __        __         _     _ _
 | | | | ___| | | ___    \\ \\      / /__  _ __| | __| | |
 | |_| |/ _ \\ | |/ _ \\    \\ \\ /\\ / / _ \\| '__| |/ _\` | |
 |  _  |  __/ | | (_) |    \\ V  V / (_) | |  | | (_| |_|
 |_| |_|\\___|_|_|\\___( )    \\_/\\_/ \\___/|_|  |_|\\__,_(_)|/
                     |/`;

		await _callback({ text: helloWorld, action: "HELLO_WORLD" });

		return true;
	},
	examples: [
		[
			{
				user: "{{user1}}",
				content: { text: "Can you show me Hello World in ASCII art?" },
			},
			{
				user: "{{user2}}",
				content: { text: "Sure! Here it is:", action: "HELLO_WORLD" },
			},
		],
		[
			{
				user: "{{user1}}",
				content: {
					text: "I want to see a cool Hello World ASCII design.",
				},
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here’s a cool Hello World for you:",
					action: "HELLO_WORLD",
				},
			},
		],
		[
			{
				user: "{{user1}}",
				content: { text: "Show me Hello World art.", action: "HELLO_WORLD" },
			},
			{
				user: "{{user2}}",
				content: {
					text: "Got it, take a look at this:",
					action: "HELLO_WORLD",
				},
			},
		],
		[
			{
				user: "{{user1}}",
				content: { text: "ASCII Hello World please.", action: "HELLO_WORLD" },
			},
			{
				user: "{{user2}}",
				content: {
					text: "Of course! Check this out:",
					action: "HELLO_WORLD",
				},
			},
		],
		[
			{
				user: "{{user1}}",
				content: {
					text: "Do you have Hello World in ASCII?",
					action: "HELLO_WORLD",
				},
			},
			{
				user: "{{user2}}",
				content: { text: "Yes, here it is:", action: "HELLO_WORLD" },
			},
		],
	] as ActionExample[][],
} as Action;
