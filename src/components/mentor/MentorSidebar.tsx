import { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface MentorSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isMobileMenuOpen: boolean;
  isDesktopCollapsed: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (e: React.MouseEvent, id: string) => void;
  onNewChat: () => void;
  onCloseMobileSidebar: () => void;
  onToggleCollapse: () => void;
}

export function MentorSidebar({
  conversations,
  activeConversationId,
  isMobileMenuOpen,
  isDesktopCollapsed,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onCloseMobileSidebar,
  onToggleCollapse
}: MentorSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const lowerQuery = searchQuery.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(lowerQuery));
  }, [conversations, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: []
    };

    filteredConversations.forEach(conv => {
      const date = parseISO(conv.updated_at);
      if (isToday(date)) groups.Today.push(conv);
      else if (isYesterday(date)) groups.Yesterday.push(conv);
      else if (isThisWeek(date)) groups["This Week"].push(conv);
      else groups.Older.push(conv);
    });

    return groups;
  }, [filteredConversations]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden transition-opacity"
          onClick={onCloseMobileSidebar}
        />
      )}

      {/* Main Sidebar */}
      <motion.div 
        animate={{ 
          width: isDesktopCollapsed ? 72 : 300,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
        className={`
          absolute md:relative z-30
          h-full flex flex-col shrink-0
          bg-black/40 backdrop-blur-2xl border-r border-white/10 shadow-2xl
          transition-transform duration-300 md:transition-none
          ${isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header Options */}
        <div className="flex flex-col border-b border-white/5">
          <div className="flex items-center justify-between h-16 px-4">
            <AnimatePresence mode="popLayout">
              {!isDesktopCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <Button 
                    onClick={onNewChat} 
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border-white/10 shadow-glow hover:shadow-glow-lg transition-all" 
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="truncate whitespace-nowrap">New Chat</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {isDesktopCollapsed && (
               <Button 
                 onClick={onNewChat} 
                 variant="outline" 
                 size="icon" 
                 className="shrink-0 mx-auto bg-white/5 hover:bg-white/10 text-white border-white/10 shadow-glow"
                 title="New Chat"
               >
                 <Plus className="w-4 h-4" />
               </Button>
            )}

            {/* Mobile Close Toggle */}
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-white hover:bg-white/10 ml-auto" onClick={onCloseMobileSidebar}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <AnimatePresence>
            {!isDesktopCollapsed && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative group overflow-hidden px-4 pb-4"
              >
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 overflow-x-hidden">
          {filteredConversations.length === 0 ? (
            <AnimatePresence>
              {!isDesktopCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center p-4 text-xs text-white/40 mt-4 whitespace-nowrap"
                >
                  {searchQuery ? "No matches found" : "No conversations"}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            Object.entries(grouped).map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label} className="space-y-1.5 flex flex-col items-center md:items-stretch">
                  <AnimatePresence>
                    {!isDesktopCollapsed && (
                      <motion.h3 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="px-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.h3>
                    )}
                  </AnimatePresence>
                  
                  {items.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 768) {
                          onCloseMobileSidebar();
                        }
                      }}
                      title={isDesktopCollapsed ? conv.title : undefined}
                      className={`
                        group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 text-sm border
                        ${activeConversationId === conv.id 
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-50 shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]" 
                          : "bg-transparent border-transparent hover:bg-white/5 text-white/70 hover:text-white"}
                        ${isDesktopCollapsed ? "justify-center w-10 h-10 p-0 mx-auto" : ""}
                      `}
                    >
                      <div className={`flex items-center gap-3 overflow-hidden ${isDesktopCollapsed ? "justify-center" : ""}`}>
                        <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${activeConversationId === conv.id ? "text-purple-400" : "opacity-50"}`} />
                        <AnimatePresence>
                          {!isDesktopCollapsed && (
                            <motion.span 
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="truncate whitespace-nowrap"
                            >
                              {conv.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {!isDesktopCollapsed && (
                        <button
                          onClick={(e) => onDeleteConversation(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-md transition-all shrink-0"
                          title="Delete Chat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}
