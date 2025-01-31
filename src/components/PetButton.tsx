'use client';

import { Button } from "@/components/ui/button";

interface PetButtonProps {
  onPet: () => void;
}

export function PetButton({ onPet }: PetButtonProps) {
  return (
    <Button 
      onClick={onPet}
      className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-pink-500/20 hover:bg-pink-500/40 backdrop-blur-sm border-2 border-pink-500/50"
      aria-label="Pet creature"
    >
      <span className="text-2xl" role="img" aria-hidden="true">
        ✨
      </span>
    </Button>
  );
} 