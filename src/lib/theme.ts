import { useEffect, useState } from "react";

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const set = (d: boolean) => {
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("fs-theme", d ? "dark" : "light");
    setDark(d);
  };
  return { dark, setDark: set };
}
