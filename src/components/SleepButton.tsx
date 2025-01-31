'use client';

import { Button } from "@/components/ui/button";

interface SleepButtonProps {
  onSleep: () => void;
}

export function SleepButton({ onSleep }: SleepButtonProps) {
  return (
    <Button 
      onClick={onSleep}
      className="fixed bottom-[168px] right-6 w-14 h-14 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 backdrop-blur-sm border-2 border-indigo-500/50"
      aria-label="Make creature sleep"
    >
      <span className="text-2xl" role="img" aria-hidden="true">
        💤
      </span>
    </Button>
  );
} 