import { useLayoutEffect } from 'react'

const LOCK_CLASS = 'scroll-locked'
const LOCK_MARKER = 'timeTrackerScrollLock'

interface BodyScrollLockOptions {
  /** Portal 弹层位于 #root 外部时，让背景应用退出焦点与辅助技术树。 */
  inertRoot?: boolean
  hideRootFromScreenReaders?: boolean
}

interface ScrollSnapshot {
  scrollY: number
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  bodyHeight: string
  bodyOverflow: string
  bodyTouchAction: string
  htmlOverflow: string
  htmlOverscroll: string
  htmlHeight: string
}

let scrollLockCount = 0
let rootInertCount = 0
let rootAriaHiddenCount = 0
let scrollSnapshot: ScrollSnapshot | null = null
let previousRootInert = false
let previousRootAriaHidden: string | null = null
let lastTouchY = 0

function canElementScroll(el: HTMLElement, deltaY: number): boolean {
  const style = window.getComputedStyle(el)
  const overflowY = style.overflowY
  const scrollable =
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    el.scrollHeight > el.clientHeight + 1

  if (!scrollable) return false

  const { scrollTop, scrollHeight, clientHeight } = el
  const maxScroll = scrollHeight - clientHeight
  if (deltaY > 0) return scrollTop < maxScroll - 1
  if (deltaY < 0) return scrollTop > 1
  return true
}

function allowTouchScroll(target: EventTarget | null, deltaY: number): boolean {
  if (!(target instanceof Element)) return false

  const allowRoot = target.closest('[data-scroll-lock-allow]')
  if (!allowRoot) return false

  let node: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement
  while (node && allowRoot.contains(node)) {
    if (canElementScroll(node, deltaY)) return true
    if (node === allowRoot) break
    node = node.parentElement
  }
  return false
}

function onTouchStart(event: TouchEvent) {
  if (event.touches.length === 1) lastTouchY = event.touches[0].clientY
}

function onTouchMove(event: TouchEvent) {
  if (event.touches.length !== 1) {
    event.preventDefault()
    return
  }
  const currentY = event.touches[0].clientY
  const deltaY = lastTouchY - currentY
  lastTouchY = currentY
  if (!allowTouchScroll(event.target, deltaY)) event.preventDefault()
}

function onWheel(event: WheelEvent) {
  if (!allowTouchScroll(event.target, event.deltaY)) event.preventDefault()
}

function acquireScrollLock(): () => void {
  scrollLockCount += 1
  if (scrollLockCount === 1) {
    const { body, documentElement } = document
    scrollSnapshot = {
      scrollY: window.scrollY,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      htmlOverflow: documentElement.style.overflow,
      htmlOverscroll: documentElement.style.overscrollBehavior,
      htmlHeight: documentElement.style.height,
    }

    body.classList.add(LOCK_CLASS)
    documentElement.classList.add(LOCK_CLASS)
    documentElement.dataset[LOCK_MARKER] = 'true'
    body.style.position = 'fixed'
    body.style.top = `-${scrollSnapshot.scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    documentElement.style.overflow = 'hidden'
    documentElement.style.height = '100%'
    documentElement.style.overscrollBehavior = 'none'

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })
  }

  let released = false
  return () => {
    if (released) return
    released = true
    scrollLockCount = Math.max(0, scrollLockCount - 1)
    if (scrollLockCount !== 0) return

    const { body, documentElement } = document
    const snapshot = scrollSnapshot
    scrollSnapshot = null
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('wheel', onWheel)
    body.classList.remove(LOCK_CLASS)
    documentElement.classList.remove(LOCK_CLASS)
    delete documentElement.dataset[LOCK_MARKER]

    if (!snapshot) return
    body.style.position = snapshot.bodyPosition
    body.style.top = snapshot.bodyTop
    body.style.left = snapshot.bodyLeft
    body.style.right = snapshot.bodyRight
    body.style.width = snapshot.bodyWidth
    body.style.height = snapshot.bodyHeight
    body.style.overflow = snapshot.bodyOverflow
    body.style.touchAction = snapshot.bodyTouchAction
    documentElement.style.overflow = snapshot.htmlOverflow
    documentElement.style.overscrollBehavior = snapshot.htmlOverscroll
    documentElement.style.height = snapshot.htmlHeight
    window.scrollTo(0, snapshot.scrollY)
  }
}

function acquireRootInert(hideFromScreenReaders: boolean): () => void {
  const root = document.getElementById('root')
  if (!root) return () => undefined

  rootInertCount += 1
  if (rootInertCount === 1) {
    previousRootInert = root.hasAttribute('inert')
    root.setAttribute('inert', '')
  }

  if (hideFromScreenReaders) {
    rootAriaHiddenCount += 1
    if (rootAriaHiddenCount === 1) {
      previousRootAriaHidden = root.getAttribute('aria-hidden')
      root.setAttribute('aria-hidden', 'true')
    }
  }

  let released = false
  return () => {
    if (released) return
    released = true

    rootInertCount = Math.max(0, rootInertCount - 1)
    if (rootInertCount === 0) {
      if (!previousRootInert) root.removeAttribute('inert')
      previousRootInert = false
    }

    if (!hideFromScreenReaders) return
    rootAriaHiddenCount = Math.max(0, rootAriaHiddenCount - 1)
    if (rootAriaHiddenCount === 0) {
      if (previousRootAriaHidden == null) root.removeAttribute('aria-hidden')
      else root.setAttribute('aria-hidden', previousRootAriaHidden)
      previousRootAriaHidden = null
    }
  }
}

/**
 * 锁定背景滚动（含 iOS 触摸穿透 / 橡皮筋）。
 * 所有弹层共享引用计数，只有最后一个弹层关闭才恢复页面。
 */
export function useBodyScrollLock(locked: boolean, options: BodyScrollLockOptions = {}) {
  const inertRoot = options.inertRoot ?? false
  const hideRootFromScreenReaders = options.hideRootFromScreenReaders ?? false

  useLayoutEffect(() => {
    if (!locked) return
    const releaseScroll = acquireScrollLock()
    const releaseRoot = inertRoot ? acquireRootInert(hideRootFromScreenReaders) : () => undefined
    return () => {
      releaseRoot()
      releaseScroll()
    }
  }, [hideRootFromScreenReaders, inertRoot, locked])
}
