import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 820px)";

const getIsMobile = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
};

export const useIsMobileDevice = () => {
  const [isMobile, setIsMobile] = useState(() => getIsMobile());

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(getIsMobile());

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
    } else {
      mediaQuery.addListener(update);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", update);
      } else {
        mediaQuery.removeListener(update);
      }
    };
  }, []);

  return isMobile;
};
