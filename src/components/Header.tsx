import { Settings, Car } from "lucide-react";

interface HeaderProps {
  available: number;
  total: number;
  onOpenAdmin: () => void;
}

export function Header({ available, total, onOpenAdmin }: HeaderProps) {
  const isFull = available === 0;

  return (
    <header className="sticky top-0 z-10 w-full glass-dark border-b border-border/40 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">TechCorp Parking</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disponibles</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${isFull ? 'text-destructive' : 'text-primary'}`}>
                {available}
              </span>
              <span className="text-sm text-muted-foreground font-medium">/ {total}</span>
            </div>
          </div>
          
          <button 
            onClick={onOpenAdmin}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full transition-colors active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
