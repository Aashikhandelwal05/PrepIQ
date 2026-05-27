import {
  LayoutDashboard,
  UserCircle,
  BookOpen,
  MessageSquare,
  Briefcase,
  TrendingUp,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  SunMoon,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Career DNA", url: "/career-dna", icon: UserCircle },
  { title: "Interview Prep", url: "/interview-prep", icon: BookOpen },
  { title: "Mock Interview", url: "/mock-interview", icon: MessageSquare },
  { title: "Job Tracker", url: "/job-tracker", icon: Briefcase },
  { title: "AI Mentor Chat", url: "/mentor-chat", icon: Bot },
  { title: "Progress", url: "/progress", icon: TrendingUp },
];

interface AppSidebarProps {
  onLogout: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const order = ["light", "dark", "system"] as const;
    const currentIndex = order.indexOf(theme as "light" | "dark" | "system");
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  const themeIcon = {
    light: <Sun className="mr-2 h-4 w-4 shrink-0" />,
    dark: <Moon className="mr-2 h-4 w-4 shrink-0" />,
    system: <SunMoon className="mr-2 h-4 w-4 shrink-0" />,
  }[theme === "dark" ? "dark" : theme === "light" ? "light" : "system"];

  const themeLabel = {
    light: "Light",
    dark: "Dark",
    system: "System",
  }[theme === "dark" ? "dark" : theme === "light" ? "light" : "system"];
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 flex items-center gap-2 border-b border-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg gradient-text">PrepIQ</span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      onClick={() => setOpenMobile(false)}
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      aria-label={item.title}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              className="hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              tooltip={themeLabel}
              aria-label="Toggle theme"
            >
              {themeIcon}
              {!collapsed && <span>{themeLabel}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              tooltip="Logout"
              aria-label="Logout"
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
