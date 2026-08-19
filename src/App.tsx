import { RecordsProvider } from './context/RecordsContext'
import { TimerProvider } from './context/TimerContext'
import { CategoriesProvider } from './context/CategoriesContext'
import { AppRouter } from './router'

function App() {
  return (
    <CategoriesProvider>
      <RecordsProvider>
        <TimerProvider>
          <AppRouter />
        </TimerProvider>
      </RecordsProvider>
    </CategoriesProvider>
  )
}

export default App
