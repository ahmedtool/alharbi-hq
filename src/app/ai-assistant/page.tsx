"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Terminal, Trash2, Copy, Eraser } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { chat } from "@/ai/flows/chat-flow";
import { z } from "genkit";
import { chatHistorySchema } from "@/ai/schemas/chat-schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db } from "@/lib/db";
import { doc, getDoc } from "@/lib/db";
import { getAccessToken } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";


type Message = {
  id: number;
  text: string;
  sender: "user" | "bot";
};

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = React.useState("https://res.cloudinary.com/dw5sydtj6/image/upload/v1755563838/%D8%A7%D9%84%D8%AD%D8%B1%D8%A8%D9%8A_imqtxp.png");

  // Feature lock
  const isLocked = false;

  useEffect(() => {
    const fetchLogo = async () => {
        try {
            const docRef = doc(db, "app_config", "branding");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().logoUrl) {
                setLogoUrl(docSnap.data().logoUrl);
            }
        } catch (error) {
            console.error("Error fetching logo for AI assistant:", error);
        }
    };
    fetchLogo();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isLocked) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: "user" };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
        const currentHistory: z.infer<typeof chatHistorySchema> = newMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            content: [{ text: msg.text }]
        }));

      const botResponse = await chat(currentHistory, (await getAccessToken()) ?? "");
      const botMessage: Message = { id: Date.now() + 1, text: botResponse, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
        console.error("AI chat error:", error);
        const errorMessage: Message = { id: Date.now() + 1, text: "عذرًا، فيه مشكلة صارت وما قدرت أجيب لك رد. حاول مرة ثانية.", sender: "bot" };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteMessage = (id: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
    toast({ title: "تم حذف الرسالة." });
  }

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم نسخ الرسالة." });
  }

  const handleClearChat = () => {
    if (window.confirm("هل أنت متأكد أنك تريد مسح سجل المحادثة بالكامل؟")) {
        setMessages([]);
        toast({ title: "تم مسح المحادثة." });
    }
  }

  useEffect(() => {
    // Scroll to the bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 text-right h-full flex flex-col">
      <PageHeader
        title="المساعد الذكي"
        description="اسألني أي شيء! أنا هنا لمساعدتك في مهامك وأفكارك."
      >
        {messages.length > 0 && (
             <Button variant="outline" size="sm" onClick={handleClearChat} disabled={isLocked}>
                <Eraser className="ml-2 h-4 w-4"/>
                مسح المحادثة
            </Button>
        )}
      </PageHeader>
      <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
         {isLocked && (
             <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>الميزة غير متاحة مؤقتاً</AlertTitle>
                <AlertDescription>
                    المساعد الذكي تحت الصيانة حاليًا. سيتم تفعيله قريبًا.
                </AlertDescription>
            </Alert>
        )}
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-0 flex-1">
            <ScrollArea className="h-[55vh] p-6" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-muted-foreground pt-16 flex flex-col items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={logoUrl} alt="أحمد المساعد" />
                        <AvatarFallback>أ</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-foreground">أهلاً بك في مركز القيادة حقك!</p>
                      <p>أنا أحمد، مساعدك الذكي. اسألني أي شيء.</p>
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`group/message flex items-start gap-3 ${message.sender === "user" ? "justify-end flex-row-reverse" : "justify-start"}`}
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender === 'bot' ? logoUrl : ''} />
                            <AvatarFallback className="text-sm">
                            {message.sender === 'user' ? 'AH' : 'أ'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2" dir={message.sender === 'user' ? 'rtl' : 'ltr'}>
                            <div className="opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyMessage(message.text)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteMessage(message.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div
                            className={`max-w-md rounded-lg p-3 text-sm ${message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                            dir="rtl"
                            >
                                <p className="whitespace-pre-wrap">{message.text}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={logoUrl} />
                        <AvatarFallback>أ</AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                      <span className="h-2 w-2 bg-foreground rounded-full animate-pulse delay-0"></span>
                      <span className="h-2 w-2 bg-foreground rounded-full animate-pulse delay-150"></span>
                      <span className="h-2 w-2 bg-foreground rounded-full animate-pulse delay-300"></span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1"
            disabled={isLoading || isLocked}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isLocked}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
