import { useState, useCallback, useMemo } from "react";
import { useSwipeable, SwipeEventData } from "react-swipeable";

interface UseSwipeToCloseOptions {
  onClose: () => void;
  direction?: "left" | "right";
  threshold?: number;
  maxOffset?: number;
  exitDuration?: number;
}

interface SwipeToCloseResult {
  handlers: ReturnType<typeof useSwipeable>;
  style: React.CSSProperties;
  isDragging: boolean;
  isExiting: boolean;
}

export function useSwipeToClose({
  onClose,
  direction = "right",
  threshold = 100,
  maxOffset = 150,
  exitDuration = 300,
}: UseSwipeToCloseOptions): SwipeToCloseResult {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const triggerExit = useCallback(() => {
    setIsExiting(true);
    // Wait for the exit animation to complete before calling onClose
    setTimeout(() => {
      onClose();
      // Reset states after close
      setIsExiting(false);
      setOffsetX(0);
      setIsDragging(false);
    }, exitDuration);
  }, [onClose, exitDuration]);

  const handleSwiping = useCallback(
    (eventData: SwipeEventData) => {
      if (window.innerWidth >= 768 || isExiting) return;

      const delta = eventData.deltaX;
      const isCorrectDirection =
        (direction === "right" && delta > 0) ||
        (direction === "left" && delta < 0);

      if (isCorrectDirection) {
        setIsDragging(true);
        // Apply resistance as offset increases
        const absDelta = Math.abs(delta);
        const resistance = 0.6;
        const resistedOffset = Math.min(absDelta * resistance, maxOffset);
        setOffsetX(direction === "right" ? resistedOffset : -resistedOffset);
      }
    },
    [direction, maxOffset, isExiting]
  );

  const handleSwipedRight = useCallback(() => {
    if (window.innerWidth >= 768 || isExiting) return;
    if (direction === "right" && offsetX > threshold * 0.6) {
      triggerExit();
    } else {
      setOffsetX(0);
      setIsDragging(false);
    }
  }, [direction, offsetX, threshold, triggerExit, isExiting]);

  const handleSwipedLeft = useCallback(() => {
    if (window.innerWidth >= 768 || isExiting) return;
    if (direction === "left" && Math.abs(offsetX) > threshold * 0.6) {
      triggerExit();
    } else {
      setOffsetX(0);
      setIsDragging(false);
    }
  }, [direction, offsetX, threshold, triggerExit, isExiting]);

  const handleTouchEnd = useCallback(() => {
    if (isExiting) return;
    // Only reset if we didn't trigger exit
    if (Math.abs(offsetX) <= threshold * 0.6) {
      setOffsetX(0);
      setIsDragging(false);
    }
  }, [offsetX, threshold, isExiting]);

  const handlers = useSwipeable({
    onSwiping: handleSwiping,
    onSwipedRight: handleSwipedRight,
    onSwipedLeft: handleSwipedLeft,
    onTouchEndOrOnMouseUp: handleTouchEnd,
    trackMouse: false,
    trackTouch: true,
    delta: 10,
    preventScrollOnSwipe: false,
  });

  const style: React.CSSProperties = useMemo(() => {
    if (isExiting) {
      // Exit animation: slide out completely
      return {
        transform: direction === "right" ? "translateX(100%)" : "translateX(-100%)",
        transition: `transform ${exitDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${exitDuration}ms ease-out`,
        opacity: 0,
      };
    }
    
    return {
      transform: `translateX(${offsetX}px)`,
      transition: isDragging ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
      opacity: isDragging ? 1 - Math.abs(offsetX) / (maxOffset * 2) : 1,
    };
  }, [offsetX, isDragging, maxOffset, isExiting, direction, exitDuration]);

  return { handlers, style, isDragging, isExiting };
}
