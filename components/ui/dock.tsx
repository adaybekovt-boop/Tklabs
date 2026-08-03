'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

const DOCK_HEIGHT = 112;
const DEFAULT_MAGNIFICATION = 72;
const DEFAULT_DISTANCE = 140;
const DEFAULT_PANEL_HEIGHT = 54;

type DockProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockInjectedProps = { isHovered?: MotionValue<number>; width?: MotionValue<number> };
type DockItemProps = { children: ReactNode; className?: string };
type DockLabelProps = { children: ReactNode; className?: string; isHovered?: MotionValue<number> };
type DockIconProps = { children: ReactNode; className?: string; width?: MotionValue<number> };
type DockContextType = { distance: number; magnification: number; mouseX: MotionValue<number>; spring: SpringOptions };

const DockContext = createContext<DockContextType | undefined>(undefined);

function DockProvider({ children, value }: { children: ReactNode; value: DockContextType }) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) throw new Error('useDock must be used within a Dock component');
  return context;
}

function Dock({
  children,
  className,
  ariaLabel = 'Primary navigation',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const isHovered = useMotionValue(0);
  const maxHeight = useMemo(() => Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4), [magnification]);
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div className="mx-2 flex max-w-full items-end overflow-x-auto" style={{ height, scrollbarWidth: 'none' }}>
      <motion.div
        className={cn('mx-auto flex w-fit items-end gap-2 rounded-2xl px-2', className)}
        onMouseMove={({ clientX }) => { isHovered.set(1); mouseX.set(clientX); }}
        onMouseLeave={() => { isHovered.set(0); mouseX.set(Number.POSITIVE_INFINITY); }}
        role="toolbar"
        aria-label={ariaLabel}
        style={{ height: panelHeight }}
      >
        <DockProvider value={{ mouseX, spring, distance, magnification }}>{children}</DockProvider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { distance, magnification, mouseX, spring } = useDock();
  const isHovered = useMotionValue(0);
  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - rect.x - rect.width / 2;
  });
  const widthTransform = useTransform(mouseDistance, [-distance, 0, distance], [40, magnification, 40]);
  const width = useSpring(widthTransform, spring);

  return (
    <motion.div
      ref={ref}
      className={cn('relative inline-flex items-center justify-center', className)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
    >
      {Children.map(children, (child) => isValidElement(child) ? cloneElement(child as ReactElement<DockInjectedProps>, { width, isHovered }) : child)}
    </motion.div>
  );
}

function DockLabel({ children, className, isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    return isHovered.on('change', (latest) => setIsVisible(latest === 1));
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn('pointer-events-none absolute -top-6 left-1/2 z-10 w-fit whitespace-pre rounded-md border border-white/15 bg-[#111516] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white', className)}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          role="tooltip"
          style={{ x: '-50%' }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, width }: DockIconProps) {
  const fallbackWidth = useMotionValue(40);
  const widthTransform = useTransform(width ?? fallbackWidth, (value) => value / 2);
  return <motion.div className={cn('flex h-full items-center justify-center', className)} style={{ width: widthTransform }}>{children}</motion.div>;
}

export { Dock, DockIcon, DockItem, DockLabel };
