import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { useLocation } from "react-router-dom";
import { commandRoutes } from "@/data/commandRoutes";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const hiddenRoutes = ["/login", "/signup"];

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");

            if (
                !hiddenRoutes.includes(location.pathname) &&
                (
                    (isMac && e.metaKey && e.key === "k") ||
                    (!isMac && e.ctrlKey && e.key === "k")
                )
            ) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }

            if (e.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", down);

        return () => window.removeEventListener("keydown", down);
    }, [location.pathname]);
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    const filteredRoutes = useMemo(() => {
        return commandRoutes.filter((route) =>
            route.title.toLowerCase().includes(query.toLowerCase())
        );
    }, [query]);


    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (!open) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev + 1 >= filteredRoutes.length ? 0 : prev + 1
                );
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev - 1 < 0 ? filteredRoutes.length - 1 : prev - 1
                );
            }

            if (e.key === "Enter") {
                e.preventDefault();

                const selected = filteredRoutes[selectedIndex];

                if (selected) {
                    navigate(selected.path);
                    setOpen(false);
                    setQuery("");
                }
            }
        };

        window.addEventListener("keydown", handleKeys);

        return () => window.removeEventListener("keydown", handleKeys);
    }, [open, filteredRoutes, selectedIndex, navigate]);

    if (hiddenRoutes.includes(location.pathname)) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-border">
                <div className="border-b border-border px-4 py-3 flex items-center gap-3">
                    <Search className="h-4 w-4 text-muted-foreground" />

                    <Input
                        ref={inputRef}
                        placeholder="Search pages..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                    />
                </div>

                <div className="max-h-[350px] overflow-y-auto p-2">
                    {filteredRoutes.length === 0 ? (
                        <div className="text-sm text-muted-foreground px-3 py-6 text-center">
                            No results found.
                        </div>
                    ) : (
                        filteredRoutes.map((route, index) => {
                            const Icon = route.icon;

                            return (
                                <button
                                    key={route.path}
                                    onClick={() => {
                                        navigate(route.path);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors
                    ${selectedIndex === index
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-accent/50"
                                        }
                  `}
                                >
                                    <Icon className="h-4 w-4" />

                                    <span className="text-sm font-medium">
                                        {route.title}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span>↑↓ Navigate</span>
                    <span>Enter Select</span>
                    <span>Esc Close</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
