import { useEffect } from 'react'

const LOCK_CLASS = 'scroll-locked'

function canElementScroll(el: HTMLElement, deltaY: number): boolean {
  const style = window.getComputedStyle(el)
  const overflowY = style.overflowY
  const scrollable =
    (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
    el.scrollHeight > el.clientHeight + 1

  if (!scrollable) return false

  const { scrollTop, scrollHeight, clientHeight } = el
  const maxScroll = scrollHeight - clientHeight
  // deltaY > 0：手指上滑，内容向下滚
  if (deltaY > 0) return scrollTop < maxScroll - 1
  if (deltaY < 0) return scrollTop > 1
  return true
}

function allowTouchScroll(target: EventTarget | null, deltaY: number): boolean {
  if (!(target instanceof Element)) return false

  const allowRoot = target.closest('[data-scroll-lock-allow]')
  if (!allowRoot) return false

  let node: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement

  while (node && allowRoot.contains(node)) {
    if (canElementScroll(node, deltaY)) return true
    if (node === allowRoot) break
    node = node.parentElement
  }

  // 允许区内已到顶/底：仍阻断，避免把背后页面带着橡皮筋滑走
  return false
}

/** 锁定背景滚动（含 iOS 触摸穿透 / 橡皮筋） */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const { body, documentElement } = document

    const prev = {
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

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    documentElement.style.overflow = 'hidden'
    documentElement.style.height = '100%'
    documentElement.style.overscrollBehavior = 'none'

    let lastY = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) lastY = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        e.preventDefault()
        return
      }
      const currentY = e.touches[0].clientY
      const deltaY = lastY - currentY
      lastY = currentY

      if (allowTouchScroll(e.target, deltaY)) return
      e.preventDefault()
    }

    const onWheel = (e: WheelEvent) => {
      if (allowTouchScroll(e.target, e.deltaY)) return
      e.preventDefault()
    }

    // passive: false 才能 preventDefault，挡住 iOS 背景滑动
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('wheel', onWheel)

      body.classList.remove(LOCK_CLASS)
      documentElement.classList.remove(LOCK_CLASS)

      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      body.style.height = prev.bodyHeight
      body.style.overflow = prev.bodyOverflow
      body.style.touchAction = prev.bodyTouchAction
      documentElement.style.overflow = prev.htmlOverflow
      documentElement.style.overscrollBehavior = prev.htmlOverscroll
      documentElement.style.height = prev.htmlHeight

      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
