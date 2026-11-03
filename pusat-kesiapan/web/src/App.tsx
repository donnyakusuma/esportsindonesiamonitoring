import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Kerangka } from './components/Kerangka'
import './lib/checkin'
import { DaftarAtlet, ProfilAtlet } from './pages/Atlet'
import CheckIn from './pages/CheckIn'
import Cabor from './pages/Cabor'
import Garmin from './pages/Garmin'
import Keseluruhan from './pages/Keseluruhan'
import TarikData from './pages/TarikData'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Kerangka />}>
          <Route path="/" element={<Keseluruhan />} />
          <Route path="/nomor/:id" element={<Cabor />} />
          <Route path="/atlet" element={<DaftarAtlet />} />
          <Route path="/atlet/:id" element={<ProfilAtlet />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/checkin/:id" element={<CheckIn />} />
          <Route path="/garmin" element={<Garmin />} />
          <Route path="/tarik-data" element={<TarikData />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
