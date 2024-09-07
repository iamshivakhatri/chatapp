import { Configuration, OpenAIApi } from 'openai-edge';
// import { CoreMessage, streamText } from 'ai';


import { CoreMessage,convertToCoreMessages, streamText, Message,  } from 'ai';
import dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
import { getContext } from '@/lib/context';
import { db } from '@/lib/db';
import { chats, messages as _messages, messageRecords } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { checkSubscription } from "@/lib/subscription";
import { apiLimit } from "@/lib/api-limit";

export const maxDuration = 30; // 

// dotenv.config();


// export const runtime = "edge";


// const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    const isPro = await  checkSubscription();
    let numberOfMessages = await apiLimit();
    if(!numberOfMessages){
      numberOfMessages = 0;
    }
    try {

        const {userId}: {userId: string | null} = auth();
        if (!userId) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});


        }

        if (!isPro && numberOfMessages >= 3) {
            console.log("Exceeded free usage limit");
            return NextResponse.json({error: 'Exceeded free usage limit'}, {status: 402});
        }


        // Parse the request body to get the messages array
        const { messages, chatId } = await req.json();
        console.log("messages in the posst", messages);
        const _chats = await db.select().from(chats).where(eq(chats.id, chatId))
        const lastMessage = messages[messages.length - 1];
        console.log("lastMessage", lastMessage);
        if(_chats.length != 1){
            return NextResponse.json({error: 'chat not found'}, {status: 404});
        }
        const fileKey = _chats[0].fileKey;
        const context = await getContext(lastMessage.content, fileKey);

        const prompt = {
            role: "system",
            content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
            The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
            AI is a well-behaved and well-mannered individual.
            AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
            AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
            AI assistant is a big fan of Pinecone and Vercel.
            START CONTEXT BLOCK
            ${context}
            END OF CONTEXT BLOCK
            AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
            If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
            AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
            AI assistant will not invent anything that is not drawn directly from the context.
            `,
          };

 
        console.log("messages", messages);

        // Ensure messages are passed correctly
        if (!messages || !Array.isArray(messages)) {
            throw new Error("Invalid prompt format: 'messages' must be an array of message objects.");
        }

        // Save user message into the database
    
        await db.insert(_messages).values({
            chatId,
            content: lastMessage.content,
            role: "user",
        });

        





        // Use streamText to get a streaming response from OpenAI
        const result = await streamText({
            model: openai('gpt-4o-mini'),
            system: `You are a helpful, respectful, and honest assistant.`,
            messages: [
                prompt,
                ...messages.filter((message: Message) => message.role === "user"),
              ],
            async onFinish({ text, toolCalls, toolResults, finishReason, usage }) {
            // implement your own storage logic:
            await db.insert(_messages).values({
                chatId,
                content: text,
                role: "system",
            });

            const existingRecord = await db.select().from(messageRecords).where(eq(messageRecords.userId, userId))
            console.log("existingRecord", existingRecord);

            if (existingRecord.length > 0) {
                // If record exists, update the record
                await db.update(messageRecords)
                    .set({
                        numberOfMessages: sql`${messageRecords.numberOfMessages} + 1`,
                    })
                    .where(eq(messageRecords.userId, userId));
                console.log("Updated existing record");
            } else {
                // If record does not exist, insert a new record
                await db.insert(messageRecords).values({
                    userId: userId,
                    numberOfMessages: 1, // Start with 1 message
                });
                console.log("Inserted new record");
            }

            },
            
        });


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
