import { Configuration, OpenAIApi } from 'openai-edge';
// import { CoreMessage, streamText } from 'ai';


import {  streamText  } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';
import { chats, messages as _messages, summary as _summary,  messageRecords } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

import { NextResponse } from 'next/server';
import { getSummaryContext } from '@/lib/summary-context';
import { auth } from '@clerk/nextjs/server';



export const maxDuration = 30; // 


export async function POST(req: Request) {
    try {

        // Parse the request body to get the messages array
        const { chatId, messages } = await req.json();
        const {userId}: {userId: string | null} = auth();
        if (!userId) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});


        }


        const _chats = await db.select().from(chats).where(eq(chats.id, chatId)) // extract the pdf_name, pdf_url for the chatid
        // const lastMessage = await messages[0].content; 
        const lastdisplay = await messages[0].content; 
        console.log("lastMessage sent before", lastdisplay);

        const lastMessage = "What is the summary of the given content? Please try to give short overview of this content."; // hardcoded for testing


        if(_chats.length != 1){
            return NextResponse.json({error: 'chat not found'}, {status: 404});
        }
        const fileKey = _chats[0].fileKey;
        const context = await getSummaryContext(fileKey);

        console.log("context while getting summary ", context);


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
            Based on the context provided, the AI assistant will generate a summary of the content.
            `,
          };


        // Use streamText to get a streaming response from OpenAI
        const result = await streamText({
            model: openai('gpt-4o-mini'),
            system: `You are a helpful, respectful, and honest assistant.`,
            prompt: prompt.content,
            async onFinish({ text, toolCalls, toolResults, finishReason, usage }) {
                // implement your own storage logic:
                await db.insert(_summary).values({
                    chatId,
                    content: text,
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
