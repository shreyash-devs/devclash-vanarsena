import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import InputScreen from './pages/InputScreen';
import AnalysisPipeline from './pages/AnalysisPipeline';
import MainExplorer from './pages/MainExplorer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/input" element={<InputScreen />} />
        <Route path="/pipeline" element={<AnalysisPipeline />} />
        <Route path="/explorer" element={<MainExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
