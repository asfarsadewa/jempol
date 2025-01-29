'use client';

import { Button } from "@/components/ui/button";

interface FeedButtonProps {
  onFeed: () => void;
}

export function FeedButton({ onFeed }: FeedButtonProps) {
  return (
    <Button 
      onClick={onFeed}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-amber-500/20 hover:bg-amber-500/40 backdrop-blur-sm border-2 border-amber-500/50"
      aria-label="Feed creature"
    >
      <span className="text-2xl" role="img" aria-hidden="true">
        🍖
      </span>
    </Button>
  );
} 