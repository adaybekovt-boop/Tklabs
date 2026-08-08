type SavedScrollStyles = {
  scrollY: number;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
};

let lockCount = 0;
let savedStyles: SavedScrollStyles | null = null;

function restoreDocumentScroll() {
  if (!savedStyles || typeof window === "undefined") return;

  const root = document.documentElement.style;
  const body = document.body.style;
  const { scrollY } = savedStyles;

  root.overflow = savedStyles.htmlOverflow;
  root.overscrollBehavior = savedStyles.htmlOverscrollBehavior;
  body.overflow = savedStyles.bodyOverflow;
  body.position = savedStyles.bodyPosition;
  body.top = savedStyles.bodyTop;
  body.left = savedStyles.bodyLeft;
  body.right = savedStyles.bodyRight;
  body.width = savedStyles.bodyWidth;

  savedStyles = null;
  window.scrollTo(0, scrollY);
}

export function lockDocumentScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;

  if (lockCount === 0) {
    const root = document.documentElement.style;
    const body = document.body.style;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    savedStyles = {
      scrollY,
      htmlOverflow: root.overflow,
      htmlOverscrollBehavior: root.overscrollBehavior,
      bodyOverflow: body.overflow,
      bodyPosition: body.position,
      bodyTop: body.top,
      bodyLeft: body.left,
      bodyRight: body.right,
      bodyWidth: body.width,
    };

    root.overflow = "hidden";
    root.overscrollBehavior = "none";
    body.overflow = "hidden";
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.left = "0";
    body.right = "0";
    body.width = "100%";
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) restoreDocumentScroll();
  };
}
