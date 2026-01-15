import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateContent } from '../utils/ai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    apiBaseUrl?: string;
}

export const AIAssistant = ({ isOpen, onClose, apiKey, apiBaseUrl }: AIAssistantProps) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm your AI coding assistant. I can help you write code, explain concepts, or debug issues. How can I help you today?",
            timestamp: Date.now()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        if (!apiKey) {
            setTimeout(() => {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: "I see you haven't configured an API key yet. Please go to Settings > AI Assistant and enter your API Key to unlock my full potential!",
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, aiMsg]);
                setIsLoading(false);
            }, 600);
            return;
        }

        try {
            const response = await generateContent(apiKey, userMsg.content, apiBaseUrl);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.error ? `Error: ${response.error}` : response.content,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I encountered an internal error processing your request.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="ai-assistant-panel"
                >
                    {/* Header */}
                    <div className="ai-header">
                        <div className="ai-title-wrapper">
                            <div className="ai-icon-box">
                                <Sparkles size={18} />
                            </div>
                            <h2 className="ai-title">AI Assistant</h2>
                        </div>
                        <button onClick={onClose} className="ai-close-btn">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="ai-messages-area custom-scrollbar">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`ai-message ${msg.role}`}
                            >
                                <div className={`ai-avatar ${msg.role}`}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                <div className={`ai-bubble ${msg.role}`}>
                                    <p>{msg.content}</p>
                                    <span className="ai-timestamp">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="ai-message assistant">
                                <div className="ai-avatar assistant">
                                    <Loader2 size={14} className="animate-spin" />
                                </div>
                                <div className="typing-indicator">
                                    <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                                    <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                                    <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="ai-input-area">
                        <div className="ai-input-wrapper">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask anything about your code..."
                                className="ai-input custom-scrollbar"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="ai-send-btn"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                        <div className="ai-disclaimer">
                            AI may produce inaccurate information.
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
