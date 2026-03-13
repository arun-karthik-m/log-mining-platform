import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@components/Layout'
import { Upload } from '@pages/Upload'
import { Dashboard } from '@pages/Dashboard'
import { LogExplorer } from '@pages/LogExplorer'
import { Patterns } from '@pages/Patterns'
import { Anomalies } from '@pages/Anomalies'
import { Clusters } from '@pages/Clusters'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - Upload */}
        <Route path="/" element={<Upload />} />
        
        {/* Main app with layout */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="logs" element={<LogExplorer />} />
          <Route path="patterns" element={<Patterns />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="clusters" element={<Clusters />} />
        </Route>

        {/* Redirect old /sources path */}
        <Route path="/sources" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
