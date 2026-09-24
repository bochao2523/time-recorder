import { Component, type ErrorInfo, type ReactNode } from 'react'

interface PageErrorBoundaryProps {
  children: ReactNode
}

interface PageErrorBoundaryState {
  hasError: boolean
}

/** 页面局部故障时保留可恢复界面，避免用户只看到空白页。 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染失败', error, info)
  }

  private reload = () => {
    window.location.reload()
  }

  private goHome = () => {
    window.location.hash = '#/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className="calico-surface stitched-light rounded-[14px] px-5 py-8 text-center" role="alert">
        <span className="depot-eyelet" aria-hidden />
        <h2 className="mt-4 text-lg font-extrabold text-terracotta">这个页面暂时没有加载成功</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-light">
          你的记录仍保存在设备中。可以重新载入页面，或先返回今天继续使用。
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={this.goHome}
            className="min-h-11 rounded-[10px] border border-terracotta/25 bg-cream px-4 text-sm font-extrabold text-terracotta active:bg-cream-dark"
          >
            返回今天
          </button>
          <button
            type="button"
            onClick={this.reload}
            className="min-h-11 rounded-[10px] bg-terracotta px-4 text-sm font-extrabold text-cream active:bg-depot-deep"
          >
            重新载入
          </button>
        </div>
      </section>
    )
  }
}
