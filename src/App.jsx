import React, { useState, useEffect } from 'react'
import DashboardNavbar from './components/DashboardNavbar'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import Proposals from './components/Proposals'
import MyProposals from './components/MyProposals'
import Reports from './components/Reports'
import Read from './components/Read'
import Donate from './components/Donate'
import SubmitProposal from './components/SubmitProposal'
import ReportDetail from './components/ReportDetail'
import Network3D from './components/Network3D'
import { useWallet } from './contexts/WalletContext'
import './App.css'

function App() {
  const { account } = useWallet()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [previousSection, setPreviousSection] = useState(null)

  const handleReportClick = (reportId) => {
    setPreviousSection('reports')
    setSelectedReportId(reportId)
    setActiveSection('report-detail')
  }

  const handleArticleClick = (articleId) => {
    setPreviousSection('read')
    setSelectedReportId(articleId)
    setActiveSection('report-detail')
  }

  const handleBack = () => {
    setSelectedReportId(null)
    if (previousSection) {
      setActiveSection(previousSection)
      setPreviousSection(null)
    } else {
      setActiveSection('reports')
    }
  }

  // Show landing page if not connected, otherwise show app with navbar
  const isConnected = !!account

  // Debug logging
  useEffect(() => {
    console.log('App: Account state changed:', account)
    console.log('App: isConnected:', !!account)
  }, [account])

  // Reset to landing page when wallet disconnects
  useEffect(() => {
    if (!account) {
      // Reset all state when disconnected - force landing page
      setActiveSection('dashboard')
      setSelectedReportId(null)
    } else {
      // When wallet connects, go to dashboard
      console.log('Account connected, redirecting to dashboard:', account)
      setActiveSection('dashboard')
    }
  }, [account])

  // Force re-render when connection status changes
  const renderKey = isConnected ? 'connected' : 'disconnected'

  return (
    <div className="app" key={renderKey}>
      <Network3D />
      {!isConnected ? (
        // Landing Page - No navbar, just simple top bar with logo and connect wallet
        <LandingPage />
      ) : (
        // App with Dashboard Navbar - Only shown after wallet connect
        <>
          <DashboardNavbar activeSection={activeSection} setActiveSection={setActiveSection} />
          <main className="main-content" style={{ paddingTop: '80px' }}>
            {activeSection === 'dashboard' && <Dashboard />}
            {activeSection === 'read' && <Read onArticleClick={handleArticleClick} />}
            {activeSection === 'donate' && <Donate />}
            {activeSection === 'proposals' && <Proposals />}
            {activeSection === 'my-proposals' && <MyProposals />}
            {activeSection === 'reports' && <Reports onReportClick={handleReportClick} />}
            {activeSection === 'report-detail' && (
              <ReportDetail 
                reportId={selectedReportId} 
                onBack={handleBack}
                sourceSection={previousSection || 'reports'}
              />
            )}
            {activeSection === 'submit' && <SubmitProposal />}
          </main>
        </>
      )}
    </div>
  )
}

export default App

