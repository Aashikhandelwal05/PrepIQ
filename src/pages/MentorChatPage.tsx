import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User as UserIcon, AlertCircle, RefreshCcw, Menu, Info, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, CareerProfile, InterviewSession, MockAttempt, JobApplication } from "@/lib/store";
import { apiRequest } from "@/lib/api";

import { CyberBackground } from "@/components/mentor/CyberBackground";
import { MentorSidebar, Conversation } from "@/components/mentor/MentorSidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MentorChatPageProps {
  user: User;
  profile: CareerProfile | null;
  sessions: InterviewSession[];
  mocks: MockAttempt[];
  jobs: JobApplication[];
}

interface MentorChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function MentorChatPage({ user, profile, sessions, mocks, jobs }: MentorChatPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiRequest<{ mentor_history_enabled: boolean }>(`/api/users/${user.id}/mentor-chat/settings`);
        setIsHistoryEnabled(res.mentor_history_enabled);
      } catch (err) {
        console.error("Failed to fetch mentor settings", err);
      }
    };
    fetchSettings();
  }, [user.id]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await apiRequest<Conversation[]>(`/api/users/${user.id}/mentor-chat/conversations`);
        setConversations(data);
        if (data.length > 0 && !activeConversationId && isHistoryEnabled) {
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
        const msgs = await apiRequest<MentorChatHistoryMessage[]>(`/api/users/${user.id}/mentor-chat/conversations/${activeConversationId}`);
        setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })));
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };
    fetchHistory();
  }, [activeConversationId, user.id]);

  const toggleHistory = async (checked: boolean) => {
    setIsHistoryEnabled(checked);
    if (!checked) {
      setActiveConversationId(null);
    }
    try {
      await apiRequest(`/api/users/${user.id}/mentor-chat/settings`, {
        method: "PATCH",
        body: JSON.stringify({ mentor_history_enabled: checked }),
      });
    } catch (err) {
      console.error("Failed to toggle setting", err);
      setIsHistoryEnabled(!checked);
    }
  };

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

      const payload = {
        conversation_id: activeConversationId || undefined,
        message: trimmed,
        skills,
        readiness_score: readinessScore,
        profile: enrichedProfile,
        ...(!isHistoryEnabled ? { history: messages.map(m => ({ role: m.role, content: m.content })) } : {})
      };

      const response = await apiRequest<{ reply: string; conversation_id: string }>(`/api/users/${user.id}/mentor-chat`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (isHistoryEnabled && !activeConversationId && response.conversation_id) {
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
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === "user"
    ) {
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

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative group/chat-container">
      <CyberBackground />

      <MentorSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isMobileMenuOpen={isMobileMenuOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        onSelectConversation={setActiveConversationId}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={() => {
          setActiveConversationId(null);
          setMessages([]);
          setIsMobileMenuOpen(false);
        }}
        onCloseMobileSidebar={() => setIsMobileMenuOpen(false)}
        onToggleCollapse={() => setIsDesktopCollapsed(prev => !prev)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-xl h-16 shrink-0 shadow-sm">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden -ml-2 shrink-0 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden md:flex -ml-2 shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-colors" 
              onClick={() => setIsDesktopCollapsed(prev => !prev)}
              title={isDesktopCollapsed ? "Open Sidebar" : "Close Sidebar"}
            >
              {isDesktopCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </Button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-white/90 truncate text-base tracking-wide flex items-center gap-2">
                AI Mentor
                {!isHistoryEnabled && <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] uppercase font-bold tracking-wider border border-orange-500/30">Private</span>}
              </h1>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 pl-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/50 whitespace-nowrap hidden sm:inline">
                Save History
              </span>
              <Switch
                checked={isHistoryEnabled}
                onCheckedChange={toggleHistory}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full animate-pulse-glow" />
                <div className="relative w-20 h-20 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl">
                  <Bot className="w-10 h-10 text-purple-400" />
                  <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-blue-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white tracking-tight">AI Mentor Ready</h2>
                <p className="text-sm text-white/50 max-w-md mx-auto">
                  Ask me about interview strategies, resume reviews, salary negotiation, or what skills to focus on next.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4 max-w-2xl">
                {[
                  "Review my skills for a Frontend role",
                  "What's a good study plan for system design?",
                  "How do I answer 'Tell me about yourself'?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 text-xs rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all text-white/70 hover:text-white shadow-sm"
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
                  initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  className={`flex gap-4 max-w-[85%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                        : "bg-black/50 border border-white/10 text-purple-400 backdrop-blur-md"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <UserIcon className="w-4 h-4" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg backdrop-backdrop-blur-md ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/20 text-white rounded-tr-sm"
                        : "bg-black/40 border border-white/10 text-white/90 rounded-tl-sm whitespace-pre-wrap"
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
              className="flex gap-4 max-w-[85%]"
            >
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg bg-black/50 border border-white/10 text-purple-400 backdrop-blur-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="rounded-2xl px-5 py-4 bg-black/40 border border-white/10 text-white/60 rounded-tl-sm text-sm flex items-center gap-2 backdrop-blur-md shadow-lg">
                <div className="flex space-x-1.5 items-center h-2">
                  <div className="w-1.5 h-1.5 bg-purple-500/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-purple-500/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-purple-500/70 rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-sm rounded-xl bg-red-950/40 border border-red-500/20 p-4 flex flex-col items-center text-center gap-3 backdrop-blur-md"
            >
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-xs text-red-200">{error}</p>
              <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={handleRetry}>
                <RefreshCcw className="w-3 h-3 mr-1" /> Retry Connection
              </Button>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/5 relative z-20">
          <div className="relative max-w-4xl mx-auto flex items-end gap-3">
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI Mentor anything..."
                className="relative w-full min-h-[56px] max-h-32 resize-none rounded-xl border border-white/10 bg-black/60 px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50 pr-14 scrollbar-thin scrollbar-thumb-white/10 shadow-inner transition-colors"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`absolute right-3 bottom-2 h-10 w-10 rounded-lg transition-all duration-300 ${
                input.trim() && !isLoading 
                  ? "bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]" 
                  : "bg-white/5 text-white/30 border border-white/5"
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <p className="text-center text-[10px] text-white/30 mt-3 flex items-center justify-center gap-1.5">
            <Info className="w-3 h-3" />
            AI Mentor responses are generated dynamically and should be verified.
          </p>
        </div>
      </div>
    </div>
  );
}
