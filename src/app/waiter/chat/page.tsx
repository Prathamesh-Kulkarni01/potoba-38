
'use client';

import type { ChatMessage } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import { formatDistanceToNow, format } from 'date-fns';

const initialChatMessages: ChatMessage[] = [
  { id: 'c1', user: 'Manju', text: 'Can we get extra mayo here?', timestamp: Date.now() - 1000 * 60 * 5, avatar: 'https://placehold.co/100x100.png' },
  { id: 'c2', user: 'Ranjeet', text: 'Do you have ketchup?', timestamp: Date.now() - 1000 * 60 * 2, avatar: 'https://placehold.co/100x100.png' },
];

export default function ChatPage() {
  const floors = ["All", "First", "Second", "Ground", "Take Away"];
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("All"); 

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, selectedFloor]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: "CurrentUser", 
      text: newMessage.trim(),
      timestamp: Date.now(),
      avatar: 'https://placehold.co/100x100.png' 
    };
    setMessages(prevMessages => [...prevMessages, newMsg]);
    setNewMessage("");
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    if (now - timestamp < 1000 * 60 * 60 * 24) { 
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } else {
      return format(new Date(timestamp), 'MMM d, HH:mm');
    }
  };

  const displayedMessages = messages; 

  return (
    <div className="h-full flex flex-col gap-4 p-1" style={{ '--header-height': '4rem', '--footer-height': 'calc(4rem + 1px)' } as React.CSSProperties}>
      <Tabs defaultValue="All" className="w-full flex flex-col flex-grow" onValueChange={setSelectedFloor}>
        <TabsList className="grid w-full grid-cols-5 bg-muted/50">
          {floors.map(floor => (
            <TabsTrigger key={floor} value={floor} className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {floor}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={selectedFloor} id="chat-container" className="flex-grow overflow-y-auto space-y-3 pt-4 pb-16 md:pb-4"> 
          {displayedMessages.map(chat => (
            <Card key={chat.id} className={`shadow-sm hover:shadow-md transition-shadow ${chat.user === 'CurrentUser' ? 'bg-primary/5' : ''}`}>
              <CardContent className="p-3 flex items-start gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={chat.avatar} alt={chat.user} data-ai-hint="profile person" />
                  <AvatarFallback>{chat.user.substring(0,1)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-sm text-foreground">{chat.user === 'CurrentUser' ? 'You' : chat.user}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(chat.timestamp)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{chat.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {displayedMessages.length === 0 && <p className="text-center text-muted-foreground py-10">No chats available for this floor.</p>}
        </TabsContent>
      </Tabs>
      
      <div className="mt-auto p-2 bg-background border-t fixed bottom-16 md:bottom-0 left-0 right-0">
       <div className="container mx-auto px-1 md:px-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-grow rounded-full h-11" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" size="icon" className="rounded-full bg-accent text-accent-foreground w-11 h-11">
              <Send size={20} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
