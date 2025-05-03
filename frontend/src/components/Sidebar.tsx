import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SidebarSection {
  title: string;
  items: { label: string; path: string }[];
}

const sections: SidebarSection[] = [
  {
    title: "Analytics",
    items: [
      { label: "Periodic Performance", path: "/dashboard/analytics/periodic" },
      { label: "Overall Performance", path: "/dashboard/analytics/overall" },
    ],
  },
];

export default function Sidebar() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const saved = localStorage.getItem("sidebarOpenSections");
      return saved ? JSON.parse(saved) : {};
    }
  );

  const [activePath, setActivePath] = useState("/dashboard");

  useEffect(() => {
    setActivePath(window.location.pathname || "/dashboard");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarOpenSections", JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    const handleLocationChange = () => {
      setActivePath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;

    for (const section of sections) {
      const containsCurrentPath = section.items.some((item) =>
        currentPath.startsWith(item.path)
      );

      if (containsCurrentPath) {
        setOpenSections((prev) => ({
          ...prev,
          [section.title]: true,
        }));
        break;
      }
    }
  }, []);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string
  ) => {
    if (e.ctrlKey || e.metaKey) return;

    e.preventDefault();
    setActivePath(path);

    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return activePath === "/dashboard";
    }
    return activePath.startsWith(path);
  };

  return (
    <aside className="w-64 min-h-screen text-gray-100 shadow-lg flex flex-col p-4 border-slate-600 border-r-2 bg-slate-900 py-8">
      <a
        href="/dashboard"
        className={`rounded-lg w-full text-left font-semibold p-2 hover:bg-slate-700 transition ${
          isActive("/dashboard") ? "text-blue-400" : "text-white"
        }`}
        onClick={(e) => handleLinkClick(e, "/dashboard")}
      >
        Dashboard
      </a>
      <nav className="flex-1 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between rounded-lg w-full text-left font-semibold p-2 hover:bg-slate-700 transition"
            >
              <span>{section.title}</span>
              {openSections[section.title] ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
            {openSections[section.title] && (
              <div className="pl-4 mt-2 space-y-2">
                {section.items.map((item) => (
                  <a
                    href={item.path}
                    key={item.label}
                    className={`block text-sm transition px-2 py-1 rounded ${
                      isActive(item.path)
                        ? "text-blue-400 font-medium bg-slate-700"
                        : "text-gray-400 hover:text-white hover:bg-slate-700"
                    }`}
                    onClick={(e) => handleLinkClick(e, item.path)}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
