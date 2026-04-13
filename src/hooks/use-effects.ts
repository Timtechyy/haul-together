import { useEffect } from "react";

export function useEffectRunner(...functions) {
  useEffect(() => {
    functions.forEach(fn => {
      if (typeof fn === "function") {
        fn();
      }
    });
  }, []);
}
