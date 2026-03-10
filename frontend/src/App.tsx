import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@components/Layout'
import { Dashboard } from '@pages/Dashboard'
import { LogExplorer } from '@pages/LogExplorer'
import { Patterns } from '@pages/Patterns'
import { Anomalies } from '@pages/Anomalies'
import { Clusters } from '@pages/Clusters'
import { Sources } from '@pages/Sources'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sources" element={<Sources />} />
          <Route path="logs" element={<LogExplorer />} />
          <Route path="patterns" element={<Patterns />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="clusters" element={<Clusters />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
