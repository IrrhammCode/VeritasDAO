import React from 'react'
import { motion } from 'framer-motion'
import MyOverview from './MyOverview'
import ActiveProposals from './ActiveProposals'
import JournalistVerification from './JournalistVerification'
import './Dashboard.css'

function Dashboard() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Monitor your VERITAS tokens, voting power, and active proposals
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="dashboard-main">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <JournalistVerification />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <MyOverview />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ActiveProposals />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
