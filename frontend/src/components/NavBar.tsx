import GitHub from "@/assets/svgComponents/github";
import Logo from "@/assets/svgComponents/logo";
import XformerlyTwitter from "@/assets/svgComponents/x";
import { Link } from "react-router-dom";

export interface Paths {
  pathName: string;
  relativePath: string;
  highlight?: boolean;
}

function NavBar() {
  return (
    <div>
      <div className="fixed inset-x-0 z-[11] w-full">
        <nav className="bg-white/30 dark:bg-transparent backdrop-blur-md shadow-md dark:shadow-slate-800">
          <div className="px-6 py-2">
            <div className="flex justify-between items-center h-10 text-lg">
              <Link to="/" className="flex gap-2 h-full">
                <Logo />
                <div className="flex text-lg font-bold items-center text-nowrap">
                  Tarang - Precision trading
                </div>
              </Link>

              <div className="flex gap-2 text-xl items-center font-semibold">
                <Link
                  to="/dashboard"
                  className="rounded-lg hover:bg-slate-700 p-2 px-3"
                >
                  Dashboard
                </Link>
                <a
                  className="rounded-lg hover:bg-slate-700 p-2 px-3"
                  href="https://github.com/ritikx01/Tarang"
                  target="_blank"
                >
                  <GitHub />
                </a>
                <a
                  className="rounded-lg hover:bg-slate-700 p-2 px-3"
                  href="https://x.com/Wh15k3yTF"
                  target="_blank"
                >
                  <XformerlyTwitter />
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>
      <div className="h-16" />
    </div>
  );
}

export default NavBar;
