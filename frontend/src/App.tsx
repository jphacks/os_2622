import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { CreateBotPage } from "./pages/CreateBotPage";
import { CompletePage } from "./pages/CompletePage";
import "./styles.css";
import { DemoProvider } from "./state/DemoProvider";
import { useDemo } from "./state/demo";
import { LoginPage } from "./pages/LoginPage";
import { MyPage } from "./pages/MyPage";
import type { ReactNode } from "react";

function RequireLogin({ children }: { children: ReactNode }) {
  const { account } = useDemo();
  return account ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <DemoProvider><BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mypage" element={<RequireLogin><MyPage /></RequireLogin>} />
        <Route path="/create" element={<RequireLogin><CreateBotPage /></RequireLogin>} />
        <Route path="/complete" element={<RequireLogin><CompletePage /></RequireLogin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter></DemoProvider>
  );
}
