import { useEffect, useState } from "react";

interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
}

const UndoToast = ({ message, duration = 10000, onUndo }: UndoToastProps) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - decrement));
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">{message}</span>
        <button
          onClick={onUndo}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
        >
          Undo
        </button>
      </div>
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-50 ease-linear rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default UndoToast;
