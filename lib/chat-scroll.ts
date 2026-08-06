export const CHAT_BOTTOM_THRESHOLD_PX = 96;

export function isNearBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = CHAT_BOTTOM_THRESHOLD_PX,
) {
  return scrollHeight - (scrollTop + clientHeight) <= threshold;
}

export function shouldAutoScroll({
  wasNearBottom,
  isNewConversation,
}: {
  wasNearBottom: boolean;
  isNewConversation?: boolean;
}) {
  return isNewConversation === true || wasNearBottom;
}

export function restoreScrollAnchor({
  previousScrollHeight,
  previousScrollTop,
  nextScrollHeight,
}: {
  previousScrollHeight: number;
  previousScrollTop: number;
  nextScrollHeight: number;
}) {
  return Math.max(0, previousScrollTop + (nextScrollHeight - previousScrollHeight));
}
