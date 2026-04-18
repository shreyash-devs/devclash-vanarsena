import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AnalysisPipeline from './pages/AnalysisPipeline';
import MainExplorer from './pages/MainExplorer';
import RepoOnboarding from './pages/RepoOnboarding';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<RepoOnboarding />} />
        <Route path="/pipeline" element={<AnalysisPipeline />} />
        <Route path="/explorer" element={<MainExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
