import { Toast } from '../common/Toast'
import { useTimer } from '../../context/TimerContext'

/** 全局计时结果提示（挂在 Layout，弹层关闭后仍可见） */
export function TimerNotice() {
  const { notice, clearNotice } = useTimer()

  return (
    <Toast
      message={notice?.message ?? ''}
      visible={!!notice}
      type={notice?.type}
      onHide={clearNotice}
    />
  )
}
