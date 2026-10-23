import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Bills from './screens/Bills';
import Finance from './screens/Finance';
import Home from './screens/Home';
import Onboarding from './screens/Onboarding';
import Plan from './screens/Plan';
import Profile from './screens/Profile';
import PurchaseDetail from './screens/PurchaseDetail';
import PurchaseForm from './screens/PurchaseForm';
import Purchases from './screens/Purchases';
import ReceiptView from './screens/ReceiptView';
import SubscriptionDetail from './screens/SubscriptionDetail';
import Subscriptions from './screens/Subscriptions';
import Today from './screens/Today';

// The scan screens pull in OCR code, so they are loaded only when opened.
const Scan = lazy(() => import('./screens/Scan'));
const ScanResult = lazy(() => import('./screens/ScanResult'));

function Loading() {
  return (
    <section className="page">
      <div className="ocr-progress">
        <div className="spinner" />
      </div>
    </section>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/i-dag" element={<Today />} />
        <Route path="/koeb" element={<Purchases />} />
        <Route path="/koeb/ny" element={<PurchaseForm />} />
        <Route path="/koeb/:id" element={<PurchaseDetail />} />
        <Route path="/koeb/:id/rediger" element={<PurchaseForm />} />
        <Route path="/koeb/:id/kvittering" element={<ReceiptView />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/scan/resultat" element={<ScanResult />} />
        <Route path="/abonnementer" element={<Subscriptions />} />
        <Route path="/abonnementer/:id" element={<SubscriptionDetail />} />
        <Route path="/regninger" element={<Bills />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/oekonomi" element={<Finance />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/velkommen" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
