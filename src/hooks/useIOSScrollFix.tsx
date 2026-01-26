import { useCallback, useRef } from 'react';

/**
 * Hook para corrigir comportamento de scroll em iOS
 * Impede que o scroll interno propague para a página quando chega nos limites
 */
export const useIOSScrollFix = () => {
  const startYRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    const currentY = e.touches[0].clientY;
    const deltaY = startYRef.current - currentY;
    const isScrollingDown = deltaY > 0;
    const isScrollingUp = deltaY < 0;

    const isAtTop = el.scrollTop <= 0;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    // Bloqueia scroll da página quando chega nos limites
    if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
      e.preventDefault();
    }

    e.stopPropagation();
  }, []);

  const scrollContainerProps = {
    ref: scrollRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    style: {
      WebkitOverflowScrolling: 'touch' as const,
      overscrollBehavior: 'contain' as const,
    },
  };

  return { scrollRef, scrollContainerProps };
};
