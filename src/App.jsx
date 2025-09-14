import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Import our pages
import BuyersList from './pages/BuyersList'   // Phase 2
import BuyerNew from './pages/BuyerNew'       // Phase 1
import BuyerView from './pages/BuyerView'     // Phase 3

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        {/* Default: redirect home to /buyers */}
        <Route path="/" element={<Navigate to="/buyers" replace />} />

        {/* List of buyers */}
        <Route path="/buyers" element={<BuyersList />} />

        {/* Create new buyer */}
        <Route path="/buyers/new" element={<BuyerNew />} />

        {/* View/Edit single buyer */}
        <Route path="/buyers/:id" element={<BuyerView />} />
      </Routes>
    </BrowserRouter>
  )
}
