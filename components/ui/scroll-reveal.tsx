"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    // Mobile — no animations
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Already visible above fold
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 60) {
      const t = setTimeout(() => setVisible(true), delay * 1000);
      return () => clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay * 1000);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "60px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return { ref, visible };
}

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "fade" | "scale";
  distance?: number;
  duration?: number;
}

export function ScrollReveal({
  children,
  delay = 0,
  className,
  direction = "up",
  distance = 30,
}: ScrollRevealProps) {
  const { ref, visible } = useReveal(delay);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const shouldAnimate = !isMobile;

  const initialTransform =
    direction === "up"
      ? `translateY(${distance}px)`
      : direction === "down"
      ? `translateY(-${distance}px)`
      : direction === "scale"
      ? "scale(0.97)"
      : "none";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shouldAnimate ? (visible ? 1 : 0) : 1,
        transform: shouldAnimate
          ? visible
            ? "none"
            : initialTransform
          : "none",
        transition: shouldAnimate
          ? `opacity 0.7s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`
          : undefined,
        willChange: shouldAnimate ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 60) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "60px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(25px)",
                transition: `opacity 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i * staggerDelay}s, transform 0.6s cubic-bezier(0.25,0.1,0.25,1) ${i * staggerDelay}s`,
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
