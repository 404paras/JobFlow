import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-9 h-9 p-0 rounded-xl">
        <Sun size={16} />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleTheme}
      className="w-9 h-9 p-0 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={`Current: ${theme} (click to change)`}
    >
      {theme === "light" && <Sun size={16} className="text-yellow-500" />}
      {theme === "dark" && <Moon size={16} className="text-indigo-400" />}
      {theme === "system" && <Monitor size={16} className="text-gray-500" />}
    </Button>
  );
}

export default ThemeToggle;

