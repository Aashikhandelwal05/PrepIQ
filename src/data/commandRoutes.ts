import {
    LayoutDashboard,
    UserCircle,
    BookOpen,
    MessageSquare,
    Briefcase,
    TrendingUp,
    Settings,
} from "lucide-react";

export const commandRoutes = [
    {
        title: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Career DNA",
        path: "/career-dna",
        icon: UserCircle,
    },
    {
        title: "Interview Prep",
        path: "/interview-prep",
        icon: BookOpen,
    },
    {
        title: "Mock Interview",
        path: "/mock-interview",
        icon: MessageSquare,
    },
    {
        title: "Job Tracker",
        path: "/job-tracker",
        icon: Briefcase,
    },
    {
        title: "Progress",
        path: "/progress",
        icon: TrendingUp,
    },
    {
        title: "Settings",
        path: "/settings",
        icon: Settings,
    },
];