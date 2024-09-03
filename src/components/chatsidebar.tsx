"use client";
import { DrizzleChat } from "@/lib/db/schema";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { MessageCircle, PlusCircle } from "lucide-react";

type Props = {
  chats: DrizzleChat[];
  chatId: number;
};

const ChatSideBar = ({chats, chatId}: Props) => {

  return (
    <div className="w-full h-screen p-4 text-gray-200 bg-gray-900">
      <Link href="/main " className=" border-dashed border-white">
        <Button className="w-full border-dashed border-white border-2">
          <PlusCircle className="w-6 h-6 mr-2" />
          Create new chat
        </Button>
      </Link>

      <div className="flex flex-col gap-2 mt-4">
        {chats.map((chat) => (
          <Link href={`/chat/${chat.id}`} key={chat.id}>
            <div 
            className={`flex justify-between p-2 rounded-md ${
                chat.id === chatId
                  ? "bg-[#ffffff43] text-white" // Selected state: Soft blue background
                  : "hover:bg-[#ededed43]" // Hover state: Light gray background
              }`}
                
                >
              <MessageCircle className="w-6 h-6 mr-1 m-auto" />
              <p className="text-sm truncate whitespace-nowrap flex-grow">
                {chat.pdfName}
              </p>
            </div>
          </Link>
        )).reverse()}
      </div>

      <div className="absolute bottom-4 left-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <Link href="/main">Home </Link>
            <Link href="/main">Source</Link>

            


        </div>

      </div>


    </div>
  );
};

export default ChatSideBar;
