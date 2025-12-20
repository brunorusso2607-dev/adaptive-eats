import { useState, useCallback, useMemo } from "react";
import { useSwipeable, SwipeEventData } from "react-swipeable";

interface UseSwipeToCloseOptions {
  onClose: () => void;
  direction?: "left" | "right";
  threshold?: number;
  maxOffset?: number;
}

interface SwipeToCloseResult {
  handlers: ReturnType<typeof useSwipeable>;
  style: React.CSSProperties;
  isDragging: boolean;
}

export function useSwipeToClose({
  onClose,
  direction = "right",
  threshold = 100,
  maxOffset = 150,
}: UseSwipeToCloseOptions): SwipeToCloseResult {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleSwiping = useCallback(
    (eventData: SwipeEventData) => {
      if (window.innerWidth >= 768) return;

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
    [direction, maxOffset]
  );

  const handleSwipedRight = useCallback(() => {
    if (window.innerWidth >= 768) return;
    if (direction === "right" && offsetX > threshold * 0.6) {
      onClose();
    }
    setOffsetX(0);
    setIsDragging(false);
  }, [direction, offsetX, threshold, onClose]);

  const handleSwipedLeft = useCallback(() => {
    if (window.innerWidth >= 768) return;
    if (direction === "left" && Math.abs(offsetX) > threshold * 0.6) {
      onClose();
    }
    setOffsetX(0);
    setIsDragging(false);
  }, [direction, offsetX, threshold, onClose]);

  const handleTouchEnd = useCallback(() => {
    setOffsetX(0);
    setIsDragging(false);
  }, []);

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

  const style: React.CSSProperties = useMemo(
    () => ({
      transform: `translateX(${offsetX}px)`,
      transition: isDragging ? "none" : "transform 0.3s ease-out",
      opacity: isDragging ? 1 - Math.abs(offsetX) / (maxOffset * 2) : 1,
    }),
    [offsetX, isDragging, maxOffset]
  );

  return { handlers, style, isDragging };
}
