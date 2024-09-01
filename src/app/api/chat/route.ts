import { Configuration, OpenAIApi } from 'openai-edge';
// import { CoreMessage, streamText } from 'ai';
import { CoreMessage,convertToCoreMessages, streamText } from 'ai';
import dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
import * as readline from 'node:readline/promises';

dotenv.config();

const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

// export const runtime = "edge";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

// const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    try {
        // Parse the request body to get the messages array
        const { messages } = await req.json();
        console.log("messages", messages);

        // Ensure messages are passed correctly
        if (!messages || !Array.isArray(messages)) {
            throw new Error("Invalid prompt format: 'messages' must be an array of message objects.");
        }

        // Use streamText to get a streaming response from OpenAI
        const result = await streamText({
            model: openai('gpt-4o-mini'),
            system: `You are a helpful, respectful, and honest assistant.`,
            messages: convertToCoreMessages(messages),
        });

        console.log("result.toText", result.toTextStreamResponse());
        console.log("result.toData", result.toDataStreamResponse());



        // Stream the text response back to the client
        return result.toDataStreamResponse();


    } catch (error) {
        console.error("Error processing request:", error);

        return new Response(JSON.stringify({ error: 'Failed to process request' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
