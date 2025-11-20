import React from 'react'
import './Loading.css'

function Loading({ message = 'Loading...', size = 'medium' }) {
  return (
    <div className={`loading-container loading-${size}`}>
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  )
}

export default Loading

