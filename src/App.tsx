import { RecordsProvider } from './context/RecordsContext'
import { TimerProvider } from './context/TimerContext'
import { AppRouter } from './router'

function App() {
  return (
    <RecordsProvider>
      <TimerProvider>
        <AppRouter />
      </TimerProvider>
    </RecordsProvider>
  )
}

export default App
