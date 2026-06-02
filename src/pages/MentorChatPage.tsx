import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon, MessageSquare, Plus, MoreHorizontal, Edit2, Trash2, Menu, Lock, Search, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User, useAuth } from "@/lib/store";
import { apiRequest } from "@/lib/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Session {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface MentorChatPageProps {
  user: User;
}

export default function MentorChatPage({ user }: MentorChatPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { user: authUser, updateUser } = useAuth();
  const activeUser = authUser || user;
  const isAnonymous = activeUser.anonymousMode ?? false;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleToggleAnonymous = async (checked: boolean) => {
    try {
      const updatedUser = await apiRequest<User>(`/api/users/${activeUser.id}/preferences`, {
        method: "PATCH",
        body: JSON.stringify({ anonymousMode: checked })
      });
      if (updateUser) updateUser(updatedUser);
    } catch (err) {
      console.error("Failed to update preferences", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load all sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await apiRequest<Session[]>(`/api/users/${activeUser.id}/mentor-chat/sessions`);
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      }
    };
    fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser.id]);

  // Load messages when currentSessionId changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const msgs = await apiRequest<Message[]>(`/api/users/${activeUser.id}/mentor-chat/sessions/${currentSessionId}/messages`);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();
  }, [currentSessionId, activeUser.id]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
    setIsMobileOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsMobileOpen(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await apiRequest(`/api/users/${activeUser.id}/mentor-chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleRenameSession = async (sessionId: string, currentTitle: string) => {
    const newTitle = prompt("Enter new title:", currentTitle);
    if (!newTitle || newTitle.trim() === "" || newTitle === currentTitle) return;
    try {
      const updated = await apiRequest<Session>(`/api/users/${activeUser.id}/mentor-chat/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle.trim() })
      });
      setSessions((prev) => prev.map(s => s.id === sessionId ? updated : s));
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    let targetSessionId = currentSessionId;
    let isNewSession = false;

    setIsLoading(true);
    setError(null);

    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      if (isAnonymous) {
        const currentMsgs = [...messages, userMessage];
        const payloadMsgs = currentMsgs.map(m => ({ role: m.role, content: m.content }));
        
        const response = await apiRequest<{ reply: string }>(`/api/users/${activeUser.id}/mentor-chat/anonymous`, {
          method: "POST",
          body: JSON.stringify({ messages: payloadMsgs }),
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.reply,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Create session if it doesn't exist
        if (!targetSessionId) {
          const newSession = await apiRequest<Session>(`/api/users/${activeUser.id}/mentor-chat/sessions`, {
            method: "POST"
          });
          targetSessionId = newSession.id;
          setCurrentSessionId(newSession.id);
          setSessions((prev) => [newSession, ...prev]);
          isNewSession = true;
        }

        const response = await apiRequest<{ reply: string }>(`/api/users/${activeUser.id}/mentor-chat/sessions/${targetSessionId}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: trimmed }),
        });

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.reply,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If it was a new session, refetch sessions to get the auto-generated title
        if (isNewSession) {
          const updatedSessions = await apiRequest<Session[]>(`/api/users/${activeUser.id}/mentor-chat/sessions`);
          setSessions(updatedSessions);
        }
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

  const SidebarContent = ({ isSidebarOpen = true }: { isSidebarOpen?: boolean }) => (
    <div className="flex flex-col h-full bg-[#050510] border-r border-[#1F1F30] overflow-hidden">
      {/* Search / New Chat */}
      <div className={`p-4 space-y-4 ${isSidebarOpen ? "" : "px-3"}`}>
        <Button 
          onClick={handleNewChat} 
          className={`w-full justify-start gap-3 bg-[#131320] hover:bg-[#1A1A27] text-white border border-[#2A2A40] rounded-xl py-6 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all duration-200 ${isSidebarOpen ? "" : "px-0 justify-center gap-0"}`}
        >
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4 text-purple-400" />
          </div>
          {isSidebarOpen && <span className="font-medium text-[15px] whitespace-nowrap">New Chat</span>}
        </Button>

        <div className="relative">
          {isSidebarOpen ? (
            <>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..." 
                className="w-full bg-[#0A0A15] border border-[#1F1F30] rounded-full pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-muted-foreground/50"
              />
            </>
          ) : (
            <Button variant="ghost" size="icon" className="w-full bg-[#0A0A15] border border-[#1F1F30] hover:bg-[#1A1A27] rounded-xl py-6">
              <Search className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 mt-2">
        {isSidebarOpen && <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider whitespace-nowrap">Today</div>}
        
        {sessions.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isSidebarOpen ? "No chats yet." : "-"}
          </div>
        )}
        {sessions.length > 0 && sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isSidebarOpen ? "No matching chats." : "-"}
          </div>
        )}
        {sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(session => {
          const isActive = currentSessionId === session.id;
          return (
            <div
              key={session.id}
              className={`group relative flex items-center justify-between py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isSidebarOpen ? "px-3" : "justify-center"
              } ${
                isActive 
                  ? "bg-gradient-to-r from-purple-500/10 to-transparent text-purple-100" 
                  : "hover:bg-[#131320] text-muted-foreground hover:text-white hover:translate-x-1"
              }`}
              onClick={() => handleSelectSession(session.id)}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              )}
              <div className={`flex items-center overflow-hidden ${isSidebarOpen ? "gap-3 mr-2" : "justify-center"}`}>
                <MessageSquare className={`w-5 h-5 shrink-0 ${isActive ? "text-purple-400" : "opacity-50"}`} />
                {isSidebarOpen && <span className={`text-sm truncate ${isActive ? "font-medium" : ""}`}>{session.title}</span>}
              </div>

              {isSidebarOpen && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-white shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1A1A27] border-[#2A2A40] text-white">
                    <DropdownMenuItem className="hover:bg-white/10 focus:bg-white/10 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleRenameSession(session.id, session.title); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 hover:bg-red-950/50 focus:bg-red-950/50 focus:text-red-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#050510] text-foreground overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Desktop Sidebar Area */}
      <div 
        className={`shrink-0 hidden md:flex flex-col z-10 transition-[width] duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? "w-[320px]" : "w-[72px]"
        }`}
      >
        <SidebarContent isSidebarOpen={isSidebarOpen} />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1F1F30] backdrop-blur-md bg-[#050510]/80">
          <div className="flex items-center gap-4">
            {/* Desktop Sidebar Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex shrink-0 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>

            {/* Mobile Sidebar Toggle */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-white hover:bg-white/10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[320px] border-r border-[#1F1F30] bg-[#050510]">
                <SidebarContent isSidebarOpen={true} />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-lg text-white tracking-wide">AI Mentor</h2>
                {isAnonymous && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#3d2616] text-[#e58a35] px-2 py-0.5 rounded-full border border-[#52321c] shadow-[0_0_10px_rgba(229,138,53,0.15)]">
                    Private
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#131320] px-3 py-1.5 rounded-full border border-[#2A2A40]">
            <Label htmlFor="save-history" className="text-xs font-medium text-muted-foreground hidden sm:block cursor-pointer">Save History</Label>
            <Switch 
              id="save-history" 
              checked={!isAnonymous} 
              onCheckedChange={(checked) => handleToggleAnonymous(!checked)} 
              className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-[#2A2A40]"
            />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col justify-end space-y-6 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 text-muted-foreground my-auto animate-in fade-in duration-700 zoom-in-95">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center mb-2 border border-purple-500/20 shadow-[0_0_30px_rgba(147,51,234,0.1)]">
                  <Bot className="w-10 h-10 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-2">How can I help you today?</h3>
                  <p className="max-w-md mx-auto text-muted-foreground/80 leading-relaxed">I can review your profile, provide study resources, conduct mock interviews, or guide your career roadmap.</p>
                </div>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                  msg.role === "user" 
                    ? "bg-[#2A2A40] text-purple-300 border border-[#3F3F5A]" 
                    : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                }`}>
                  {msg.role === "user" ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-4 text-[15px] leading-relaxed shadow-lg ${
                  msg.role === "user" 
                    ? "bg-purple-600/10 text-purple-50 rounded-2xl rounded-tr-sm border border-purple-500/20" 
                    : "bg-[#131320]/80 backdrop-blur-md rounded-2xl rounded-tl-sm text-gray-200 border border-[#2A2A40]"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.2)] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-[#131320]/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-5 py-5 flex items-center gap-2 border border-[#2A2A40] shadow-lg">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm text-center animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* Input Area Dock */}
        <div className="px-4 pb-6 pt-2 bg-gradient-to-t from-[#050510] via-[#050510] to-transparent shrink-0">
          <div className="max-w-4xl mx-auto relative">
            <div className="bg-[#131320]/80 backdrop-blur-xl border border-[#2A2A40] rounded-2xl shadow-2xl overflow-hidden focus-within:ring-1 focus-within:ring-purple-500/50 focus-within:border-purple-500/50 transition-all duration-300">
              <div className="flex items-end p-2 gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your AI Mentor anything..."
                  className="flex-1 min-h-[44px] max-h-48 bg-transparent px-4 py-3 text-[15px] text-gray-200 resize-none focus:outline-none placeholder:text-muted-foreground/60 leading-relaxed"
                  rows={1}
                />
                <div className="p-1 shrink-0 pb-1.5 pr-1.5">
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`h-10 w-10 rounded-xl transition-all duration-300 ${
                      input.trim() && !isLoading 
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]" 
                        : "bg-[#2A2A40] text-muted-foreground"
                    }`}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-center mt-3 text-xs text-muted-foreground/50">
              AI Mentor responses are generated dynamically and should be verified.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
