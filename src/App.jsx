import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import HomeBar from './components/Core/HomeBar'
import Sidebar from './components/Core/Sidebar'
import DeepnestPage from './pages/DeepnestPage'
import SVGGeneratorParent from './pages/SVGGenerator/SVGGeneratorParent'
import InfoPage from './pages/InfoPage'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <BrowserRouter>
      <div className="app">
        {/* Fixed HomeBar at top */}
        <HomeBar />
        
        {/* Collapsible Sidebar */}
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={handleToggleSidebar}
        />
        
        {/* Main Content Area */}
        <main className={`main ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Routes>
            <Route path="/" element={<DeepnestPage />} />
            <Route path="/svg-generator" element={<SVGGeneratorParent />} />
            <Route path="/info" element={<InfoPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App