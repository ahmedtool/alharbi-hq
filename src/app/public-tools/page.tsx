
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Library, Link as LinkIcon } from "lucide-react";
import { tools as staticTools } from './tools';
import { db } from "@/lib/db";
import { collection, getDocs, query } from "@/lib/db";

interface ToolForClient {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
}

export default function PublicToolsPage() {
    const [tools, setTools] = useState<ToolForClient[]>(staticTools);
    const [isLoading, setIsLoading] = useState(false); // Can be used for dynamic fetching later

    // Note: The logic to fetch from Firestore has been removed to make this a static page.
    // If you want to make it dynamic again, you can uncomment and adapt the following useEffect.
    /*
    useEffect(() => {
        const fetchTools = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, "public_tools"));
                const querySnapshot = await getDocs(q);
                const dbTools = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ToolForClient));
                setTools(dbTools);
            } catch (error) {
                console.error("Error fetching public tools:", error);
                // Optionally set an error state
            } finally {
                setIsLoading(false);
            }
        };
        fetchTools();
    }, []);
    */

    const groupedTools = tools.reduce((acc, tool) => {
        const category = tool.category || 'غير مصنف';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(tool);
        return acc;
    }, {} as Record<string, ToolForClient[]>);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16 sm:pb-24">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold flex items-center justify-center gap-3"><Library /> مكتبة الأدوات والموارد</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">مجموعة منتقاة من الأدوات والمواقع المفيدة التي صممتها وأوصي بها لتسهيل عملك وإطلاق إبداعك.</p>
            </div>
            
            <div className="space-y-16">
                {Object.keys(groupedTools).length > 0 ? (
                    <>
                        {Object.entries(groupedTools).map(([category, toolList]) => (
                            <section key={category}>
                                <h2 className="text-2xl font-bold mb-6">{category}</h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {toolList.map(tool => (
                                        <Card key={tool.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="truncate">{tool.name}</CardTitle>
                                                <CardDescription className="line-clamp-2 h-10">{tool.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-grow flex items-end">
                                                <Button asChild variant="secondary" className="w-full">
                                                    <a href={tool.url} target="_blank" rel="noopener noreferrer">
                                                        <LinkIcon className="ml-2 h-4 w-4" />
                                                        زيارة الموقع
                                                    </a>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p>لا توجد أدوات عامة في المكتبة حاليًا. عد قريبًا!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
