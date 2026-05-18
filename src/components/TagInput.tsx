import { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = "Type and press Enter..." }: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
     if (!tags.some((t) => t.toLowerCase() === input.trim().toLowerCase())) {
        onChange([...tags, input.trim()]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
  e.preventDefault();
  const pasted = e.clipboardData.getData("text");
  
  const newTags = pasted
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);  // removes empty strings
  
  const existingLower = tags.map((t) => t.toLowerCase());
  
  const unique = newTags.filter(
    (t) => !existingLower.includes(t.toLowerCase())
  );
  
  if (unique.length > 0) {
    onChange([...tags, ...unique]);
  }
  setInput("");
};

  return (
    <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-input bg-secondary/50 min-h-[42px]">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 bg-primary/20 text-primary border-primary/30"
        >
          {tag}
          <X
            className="w-3 h-3 cursor-pointer hover:text-destructive"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          />
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste} 
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
      />
    </div>
  );
}
