import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import DateReveal from "./pages/DateReveal";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/date/:id" element={<DateReveal />} />
        <Route path="/not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
