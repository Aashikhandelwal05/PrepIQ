import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User as UserIcon, AlertCircle, RefreshCcw, Menu, Plus, MessageSquare, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User, CareerProfile, InterviewSession, MockAttempt, JobApplication } from "@/lib/store";
import { apiRequest } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface MentorChatPageProps {
  user: User;
  profile: CareerProfile | null;
  sessions: InterviewSession[];
  mocks: MockAttempt[];
  jobs: JobApplication[];
}

export default function MentorChatPage({ user, profile, sessions, mocks, jobs }: MentorChatPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await apiRequest<Conversation[]>(`/api/users/${user.id}/mentor-chat/conversations`);
        setConversations(data);
        if (data.length > 0 && !activeConversationId) {
          setActiveConversationId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch conversations", err);
      }
    };
    fetchConversations();
  }, [user.id]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const msgs = await apiRequest<any[]>(`/api/users/${user.id}/mentor-chat/conversations/${activeConversationId}`);
        setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })));
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchHistory();
  }, [activeConversationId, user.id]);

  const handleSend = async (messageText: string = input) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const skills = profile ? [
        ...profile.technicalSkills.map(s => s.name),
        ...profile.softSkills
      ] : [];
      
      const latestSession = sessions.length > 0 
        ? [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
        
      const readinessScore = latestSession ? latestSession.readinessScore : 0;
      
      const enrichedProfile = {
        ...(profile || {}),
        prepContext: latestSession ? {
          jobTitle: latestSession.jobTitle,
          company: latestSession.company,
          gapAnalysis: latestSession.gapAnalysis,
          roadmap: latestSession.roadmap,
          extractedSkills: latestSession.extractedSkills,
        } : null,
        mockPerformance: mocks.slice(-3).map(m => ({
          question: m.question,
          aiScore: m.aiScore,
          verdict: m.aiFeedback.oneLineVerdict
        })),
        jobTrackerData: jobs.map(j => ({
          company: j.companyName,
          title: j.jobTitle,
          status: j.status
        }))
      };

      const response = await apiRequest<{ reply: string; conversation_id: string }>(`/api/users/${user.id}/mentor-chat`, {
        method: "POST",
        body: JSON.stringify({
          conversation_id: activeConversationId || undefined,
          message: trimmed,
          skills,
          readiness_score: readinessScore,
          profile: enrichedProfile
        }),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (!activeConversationId) {
        setActiveConversationId(response.conversation_id);
        const updated = await apiRequest<Conversation[]>(`/api/users/${user.id}/mentor-chat/conversations`);
        setConversations(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to communicate with AI Mentor.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      const lastMessage = messages[messages.length - 1].content;
      setMessages((prev) => prev.slice(0, -1));
      handleSend(lastMessage);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiRequest(`/api/users/${user.id}/mentor-chat/conversations/${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const createNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border bg-card shadow-sm overflow-hidden animate-slide-up relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        absolute md:relative z-30
        w-64 h-full bg-muted/30 border-r border-border flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-4 flex items-center justify-between">
          <Button onClick={createNewChat} className="w-full flex items-center gap-2" variant="outline">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden ml-2" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center p-4 text-xs text-muted-foreground mt-4">
              No previous conversations
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm
                  ${activeConversationId === conv.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all shrink-0"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-muted/10 h-16 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2 shrink-0" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-glow shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-foreground truncate">
              {activeConversationId 
                ? conversations.find(c => c.id === activeConversationId)?.title || "AI Mentor"
                : "New Chat"}
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-lg">How can I help you today, {user.name}?</p>
                <p className="text-sm max-w-md mx-auto mt-2">
                  Ask me about interview strategies, resume reviews, salary negotiation, or what skills to focus on next.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
                {[
                  "How do I answer 'Tell me about yourself'?",
                  "Can you review my skills for a Frontend role?",
                  "What's a good study plan for system design?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-muted transition-colors text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <UserIcon className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none whitespace-pre-wrap"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[85%]"
            >
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted text-muted-foreground rounded-tl-none text-sm flex items-center gap-2">
                <span className="flex space-x-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                </span>
                AI Mentor is thinking...
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-sm rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex flex-col items-center text-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleRetry}>
                <RefreshCcw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t">
          <div className="relative max-w-4xl mx-auto flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI Mentor anything..."
              className="w-full min-h-[52px] max-h-32 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-12 scrollbar-thin"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 bottom-1.5 h-9 w-9 rounded-lg transition-all ${
                input.trim() && !isLoading ? "gradient-primary text-primary-foreground shadow-md" : ""
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            AI Mentor can make mistakes. Verify important career advice.
          </p>
        </div>
      </div>
    </div>
  );
}
