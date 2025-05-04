import NavBar from "./components/NavBar";
import DashboardPage from "./pages/PeriodicPerformance";
import { ReactLenis } from "lenis/react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import OverallPerformance from "./components/OverallPerformance";
import ActiveTrades from "./components/ActiveSignals";

const Layout = () => (
  <div id="root" className="flex flex-col min-h-screen relative">
    <NavBar />
    <main className="flex-1 relative z-10 h-max">
      <Outlet />
    </main>
  </div>
);

const ErrorPage = ({ code = 500, message = "Something went wrong" }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h1 className="text-4xl font-bold text-gray-600">{code}</h1>
      <p className="text-gray-400">{message}</p>
      <button
        onClick={() => navigate("/")}
        className="px-4 py-2 text-white bg-[rgba(218,165,32,0.8)] rounded hover:bg-[rgb(218,165,32)] transition-colors"
      >
        Go Home
      </button>
    </div>
  );
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage />, errorElement: <ErrorPage /> },
      {
        path: "/dashboard/analytics/periodic",
        element: <DashboardPage />,
        errorElement: <ErrorPage />,
      },
      {
        path: "/dashboard/analytics/overall",
        element: <OverallPerformance />,
        errorElement: <ErrorPage />,
      },
      {
        path: "/dashboard/",
        element: <ActiveTrades />,
        errorElement: <ErrorPage />,
      },
      {
        path: "/signals/current",
        element: <ActiveTrades />,
        errorElement: <ErrorPage />,
      },
      { path: "*", element: <ErrorPage /> },
    ],
  },
]);

function App() {
  document.documentElement.classList.toggle("dark", true);
  return (
    <ReactLenis root>
      <RouterProvider router={router} />
    </ReactLenis>
  );
}

export default App;
