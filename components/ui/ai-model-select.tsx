"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type HTMLMotionProps,
} from "framer-motion";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/* =============================================================================
 * ModelSelector
 *
 * Portal-based AI model picker: trigger shows the current model, content is a
 * keyboard-navigable listbox positioned against the trigger. Adapted to this
 * project's surface/outline/primary token set (no shadcn popover/muted/accent
 * tokens exist here).
 *
 *   <ModelSelector value={sel} onValueChange={setSel} models={models}>
 *     <ModelSelectorTrigger>
 *       <ModelSelectorValue />
 *     </ModelSelectorTrigger>
 *     <ModelSelectorContent />
 *   </ModelSelector>
 * ============================================================================= */

const EASE = [0.2, 0, 0, 1] as const
const SPRING_PRESS = { type: "spring" as const, stiffness: 500, damping: 28 }
const SPRING_ICON = { type: "spring" as const, duration: 0.3, bounce: 0 }

const MENU_PANEL_CLASS = cn(
  "bg-surface-container-lowest text-primary rounded-2xl border border-outline-variant p-1.5",
  "shadow-[0_8px_30px_-8px_rgba(8,8,8,0.18),0_2px_8px_-2px_rgba(8,8,8,0.08)]",
  "dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.45),0_2px_8px_-2px_rgba(0,0,0,0.3)]"
)

type PresenceProps = Pick<
  HTMLMotionProps<"span">,
  "initial" | "animate" | "exit" | "transition"
>

const FADE_ONLY: PresenceProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const ICON_SWAP: PresenceProps = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  transition: SPRING_ICON,
}

function scaleBlurPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.9, filter: "blur(4px)" },
    transition: SPRING_ICON,
  }
}

function menuPresence(reduceMotion: boolean): PresenceProps {
  if (reduceMotion) return FADE_ONLY
  return {
    initial: { opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: 4, scale: 0.98, filter: "blur(2px)" },
    transition: { duration: 0.2, ease: EASE },
  }
}

function valuePresence(reduceMotion: boolean): PresenceProps {
  return reduceMotion ? FADE_ONLY : ICON_SWAP
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: EASE },
  },
}

const itemVariantsReduced = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AiModel = {
  id: string
  label: string
  /** Separates this entry from the group above it with a hairline, no caption. */
  groupStart?: boolean
  disabled?: boolean
}

export type AiModelSelection = {
  id: string
}

export interface ModelSelectorProps {
  children: React.ReactNode
  models?: AiModel[]
  value?: AiModelSelection
  defaultValue?: AiModelSelection
  onValueChange?: (value: AiModelSelection) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

export interface ModelSelectorTriggerProps extends Omit<
  HTMLMotionProps<"button">,
  "children"
> {
  children?: React.ReactNode
}

export type ModelSelectorValueProps = React.HTMLAttributes<HTMLSpanElement>

export interface ModelSelectorContentProps extends Omit<
  HTMLMotionProps<"div">,
  "children"
> {
  children?: React.ReactNode
  side?: "top" | "bottom"
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ModelSelectorContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  selection: AiModelSelection
  selectModel: (id: string) => void
  models: AiModel[]
  selectedModel: AiModel | undefined
  disabled: boolean
  reduceMotion: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  contentId: string
  layoutGroupId: string
  activeIndex: number
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  optionIds: string[]
  ariaLabel: string
  side: "top" | "bottom"
  setSide: (side: "top" | "bottom") => void
}

function optionDomId(contentId: string, modelId: string) {
  return `${contentId}-option-${modelId}`
}

function firstEnabledIndex(models: AiModel[], optionIds: string[]) {
  for (let i = 0; i < optionIds.length; i++) {
    const model = models.find((m) => m.id === optionIds[i])
    if (model && !model.disabled) return i
  }
  return 0
}

function lastEnabledIndex(models: AiModel[], optionIds: string[]) {
  for (let i = optionIds.length - 1; i >= 0; i--) {
    const model = models.find((m) => m.id === optionIds[i])
    if (model && !model.disabled) return i
  }
  return Math.max(0, optionIds.length - 1)
}

const ModelSelectorContext =
  React.createContext<ModelSelectorContextValue | null>(null)

function useModelSelectorContext(component: string): ModelSelectorContextValue {
  const ctx = React.useContext(ModelSelectorContext)
  if (!ctx) {
    throw new Error(`${component} must be used within <ModelSelector>`)
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function assignRef<T>(
  node: T | null,
  ...refs: Array<React.Ref<T> | undefined>
) {
  for (const ref of refs) {
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ;(ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  return reduceMotion
}

function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value: T | undefined
  defaultValue: T
  onChange?: (value: T) => void
}): [T, (next: T | ((prev: T) => T)) => void] {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : uncontrolled

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next
      if (!isControlled) setUncontrolled(resolved)
      onChange?.(resolved)
    },
    [isControlled, onChange, current]
  )

  return [current, setValue]
}

function resolveSelection(
  models: AiModel[],
  value?: AiModelSelection
): AiModelSelection {
  const model = models.find((m) => m.id === value?.id) ?? models[0]
  return { id: model?.id ?? value?.id ?? "" }
}

function MenuCheckmark({
  visible,
  reduceMotion,
  className,
}: {
  visible: boolean
  reduceMotion: boolean
  className?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.span
          key="check"
          {...scaleBlurPresence(reduceMotion)}
          className={cn("flex shrink-0", className)}
        >
          <CheckIcon className="size-3.5" aria-hidden />
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function ModelSelector({
  children,
  models = [],
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  className,
  "aria-label": ariaLabel = "AI models",
}: ModelSelectorProps) {
  const reduceMotion = usePrefersReducedMotion()
  const layoutGroupId = React.useId()
  const contentId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const initial = defaultValue ?? { id: models[0]?.id ?? "" }

  const [selection, setSelection] = useControllableState({
    value: valueProp,
    defaultValue: initial,
    onChange: onValueChange,
  })

  const [open, setOpenState] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })

  const [activeIndex, setActiveIndex] = React.useState(0)
  const [side, setSide] = React.useState<"top" | "bottom">("top")

  const optionIds = React.useMemo(() => models.map((m) => m.id), [models])
  const resolved = resolveSelection(models, selection)
  const selectedModel = models.find((m) => m.id === resolved.id) ?? models[0]

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (disabled && next) return
      setOpenState(next)
    },
    [disabled, setOpenState]
  )

  const selectModel = React.useCallback(
    (id: string) => {
      const model = models.find((m) => m.id === id)
      if (!model || model.disabled) return
      setSelection({ id: model.id })
      setOpen(false)
      triggerRef.current?.focus()
    },
    [models, setSelection, setOpen]
  )

  React.useEffect(() => {
    if (!open) return
    const idx = optionIds.indexOf(resolved.id)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs keyboard focus to the current selection each time the menu opens.
    setActiveIndex(idx >= 0 ? idx : firstEnabledIndex(models, optionIds))
  }, [open, optionIds, resolved.id, models])

  React.useEffect(() => {
    if (!open) return

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      const inTrigger = triggerRef.current?.contains(target)
      const inContent = contentRef.current?.contains(target)
      if (!inTrigger && !inContent) setOpen(false)
    }

    document.addEventListener("mousedown", onPointer)
    document.addEventListener("touchstart", onPointer)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("touchstart", onPointer)
    }
  }, [open, setOpen])

  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled, setOpen])

  return (
    <ModelSelectorContext.Provider
      value={{
        open,
        setOpen,
        selection: resolved,
        selectModel,
        models,
        selectedModel,
        disabled,
        reduceMotion,
        triggerRef,
        contentRef,
        contentId,
        layoutGroupId,
        activeIndex,
        setActiveIndex,
        optionIds,
        ariaLabel,
        side,
        setSide,
      }}
    >
      <div
        data-slot="model-selector"
        data-state={open ? "open" : "closed"}
        className={cn("relative inline-flex", className)}
      >
        {children}
      </div>
    </ModelSelectorContext.Provider>
  )
}

ModelSelector.displayName = "ModelSelector"

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

const ModelSelectorTrigger = React.forwardRef<
  HTMLButtonElement,
  ModelSelectorTriggerProps
>(({ className, children, disabled, onClick, onKeyDown, ...props }, ref) => {
  const {
    open,
    setOpen,
    triggerRef,
    contentId,
    disabled: rootDisabled,
    selectedModel,
    selectModel,
    models,
    activeIndex,
    setActiveIndex,
    optionIds,
  } = useModelSelectorContext("ModelSelectorTrigger")

  const isDisabled = disabled || rootDisabled
  const label = selectedModel?.label ?? "Select model"
  const activeOptionId = optionIds[activeIndex]
    ? optionDomId(contentId, optionIds[activeIndex])
    : undefined

  function moveActive(delta: number) {
    if (!optionIds.length) return
    setActiveIndex((previous) => {
      let next = open ? previous : optionIds.indexOf(selectedModel?.id ?? "")
      if (next < 0) next = firstEnabledIndex(models, optionIds)
      for (let index = 0; index < optionIds.length; index += 1) {
        next = (next + delta + optionIds.length) % optionIds.length
        if (!models.find((model) => model.id === optionIds[next])?.disabled) return next
      }
      return previous
    })
  }

  return (
    <motion.button
      ref={(node) => assignRef(node, ref, triggerRef)}
      type="button"
      disabled={isDisabled}
      role="combobox"
      aria-autocomplete="none"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={contentId}
      aria-activedescendant={open ? activeOptionId : undefined}
      aria-label={`Model: ${label}`}
      data-slot="model-selector-trigger"
      data-state={open ? "open" : "closed"}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || isDisabled) return
        setOpen(!open)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || isDisabled) return
        if (event.key === "Escape" && open) {
          event.preventDefault()
          setOpen(false)
          return
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault()
          setOpen(true)
          moveActive(event.key === "ArrowDown" ? 1 : -1)
          return
        }
        if (event.key === "Home" || event.key === "End") {
          event.preventDefault()
          setOpen(true)
          setActiveIndex(event.key === "Home" ? firstEnabledIndex(models, optionIds) : lastEnabledIndex(models, optionIds))
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!open) {
            setOpen(true)
            return
          }
          const id = optionIds[activeIndex]
          if (id) selectModel(id)
        }
      }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={SPRING_PRESS}
      className={cn(
        "text-on-secondary-container flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium",
        "transition-[background-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        "hover:bg-surface-container-low hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        "disabled:pointer-events-none disabled:opacity-40",
        open && "bg-surface-container-low text-primary",
        className
      )}
      {...props}
    >
      {children ?? <ModelSelectorValue />}
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="flex shrink-0"
      >
        <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden />
      </motion.span>
    </motion.button>
  )
})
ModelSelectorTrigger.displayName = "ModelSelectorTrigger"

// ---------------------------------------------------------------------------
// Value
// ---------------------------------------------------------------------------

function ModelSelectorValue({ className, ...props }: ModelSelectorValueProps) {
  const { selectedModel, selection, reduceMotion } =
    useModelSelectorContext("ModelSelectorValue")

  return (
    <span
      data-slot="model-selector-value"
      className={cn("relative flex min-w-0 items-center", className)}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={selection.id}
          {...valuePresence(reduceMotion)}
          className="text-primary truncate font-medium"
        >
          {selectedModel?.label ?? "Select model"}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
ModelSelectorValue.displayName = "ModelSelectorValue"

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const ModelSelectorContent = React.forwardRef<
  HTMLDivElement,
  ModelSelectorContentProps
>(({ className, children, side: sideProp = "top", style, ...props }, ref) => {
  const {
    open,
    contentId,
    triggerRef,
    contentRef,
    reduceMotion,
    ariaLabel,
    setSide,
  } = useModelSelectorContext("ModelSelectorContent")

  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState<{
    top: number
    left: number
    width: number
    placement: "top" | "bottom"
    maxHeight: number
  } | null>(null)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target only exists after client mount.
    setMounted(true)
  }, [])

  React.useEffect(() => {
    setSide(sideProp)
  }, [sideProp, setSide])

  React.useLayoutEffect(() => {
    if (!open) return
    const viewport = window.visualViewport

    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportTop = viewport?.offsetTop ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth
      const viewportHeight = viewport?.height ?? window.innerHeight
      const viewportRight = viewportLeft + viewportWidth
      const viewportBottom = viewportTop + viewportHeight
      const gutter = 8
      const menuWidth = Math.min(Math.max(rect.width, 224), Math.max(0, viewportWidth - gutter * 2))
      const roomBelow = viewportBottom - rect.bottom - gutter
      const roomAbove = rect.top - viewportTop - gutter
      const minimumUsableHeight = 160
      const placeTop = sideProp === "top"
        ? roomAbove >= minimumUsableHeight || roomAbove >= roomBelow
        : roomBelow >= minimumUsableHeight || roomBelow > roomAbove
      const availableHeight = Math.max(0, placeTop ? roomAbove : roomBelow)
      const maxHeight = Math.min(420, availableHeight)
      const left = Math.min(
        Math.max(viewportLeft + gutter, rect.left),
        Math.max(viewportLeft + gutter, viewportRight - menuWidth - gutter),
      )
      setCoords({
        top: placeTop
          ? Math.min(viewportBottom - gutter, Math.max(viewportTop + gutter, rect.top - gutter))
          : Math.min(viewportBottom - gutter, Math.max(viewportTop + gutter, rect.bottom + gutter)),
        left,
        width: menuWidth,
        placement: placeTop ? "top" : "bottom",
        maxHeight,
      })
    }

    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    viewport?.addEventListener("resize", update)
    viewport?.addEventListener("scroll", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
      viewport?.removeEventListener("resize", update)
      viewport?.removeEventListener("scroll", update)
    }
  }, [open, triggerRef, sideProp])

  if (!mounted) return null

  const list = children ?? <ModelSelectorDefaultItems />

  return createPortal(
    <AnimatePresence>
      {open && coords ? (
        <motion.div
          key={contentId}
          ref={(node) => assignRef(node, ref, contentRef)}
          data-slot="model-selector-content"
          {...FADE_ONLY}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            transform: coords.placement === "top" ? "translateY(-100%)" : undefined,
            maxHeight: coords.maxHeight,
            maxWidth: "calc(100vw - 16px)",
            overflowY: "auto",
            zIndex: 50,
            ...style,
          }}
          className={cn("origin-top-left", className)}
          {...props}
        >
          <motion.div {...menuPresence(reduceMotion)} className="flex w-full items-start">
            <div
              id={contentId}
              role="listbox"
              aria-label={ariaLabel}
              data-slot="model-selector-listbox"
              className="min-w-0 w-full"
            >
              {list}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
})
ModelSelectorContent.displayName = "ModelSelectorContent"

// ---------------------------------------------------------------------------
// Default list
// ---------------------------------------------------------------------------

function ModelSelectorDefaultItems() {
  const { models, layoutGroupId, reduceMotion } =
    useModelSelectorContext("ModelSelectorDefaultItems")

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.ul
        role="presentation"
        variants={listVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className={cn(MENU_PANEL_CLASS, "flex min-w-56 max-h-[min(60vh,22rem)] flex-col gap-0.5 overflow-y-auto overscroll-contain")}
      >
        {models.map((model) => (
          <li key={model.id} role="none">
            {model.groupStart ? (
              <div className="mx-1.5 my-1 border-t border-outline-variant" />
            ) : null}
            <ModelSelectorItem model={model} />
          </li>
        ))}
      </motion.ul>
    </LayoutGroup>
  )
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

function ModelSelectorItem({ model }: { model: AiModel }) {
  const {
    selection,
    selectModel,
    reduceMotion,
    layoutGroupId,
    contentId,
    activeIndex,
    setActiveIndex,
    optionIds,
  } = useModelSelectorContext("ModelSelectorItem")

  const isActive = model.id === selection.id
  const optionIndex = optionIds.indexOf(model.id)
  const isHighlighted = optionIndex === activeIndex && optionIndex >= 0
  const isDisabled = !!model.disabled
  const optionId = optionDomId(contentId, model.id)

  const optionRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (isHighlighted) {
      optionRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [isHighlighted])

  return (
    <motion.div
      ref={optionRef}
      id={optionId}
      role="option"
      aria-selected={isActive}
      aria-disabled={isDisabled || undefined}
      data-slot="model-selector-item"
      data-highlighted={isHighlighted ? "" : undefined}
      data-active={isActive ? "" : undefined}
      variants={reduceMotion ? itemVariantsReduced : itemVariants}
      onMouseEnter={() => {
        if (!isDisabled && optionIndex >= 0) setActiveIndex(optionIndex)
      }}
      onClick={() => {
        if (!isDisabled) selectModel(model.id)
      }}
      className={cn(
        "group/item relative flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm",
        "transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        isActive ? "text-primary" : "text-on-secondary-container",
        isHighlighted && !isActive && "bg-surface-container-low/70",
        isDisabled && "pointer-events-none opacity-40",
        !isDisabled && "active:scale-[0.98]"
      )}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={SPRING_PRESS}
    >
      {isActive ? (
        <motion.span
          layoutId={`${layoutGroupId}-active`}
          className="bg-surface-container-low absolute inset-0 rounded-xl"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      ) : null}
      <span className="relative z-10 min-w-0 flex-1 truncate font-medium">
        {model.label}
      </span>
      <span className="relative z-10 flex size-3.5 shrink-0 items-center justify-center">
        {isActive ? (
          <MenuCheckmark visible reduceMotion={reduceMotion} className="text-primary" />
        ) : null}
      </span>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorValue,
  ModelSelectorContent,
}
