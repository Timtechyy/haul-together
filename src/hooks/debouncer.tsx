import { useEffect, useState } from "react";

export function useDebounce(value, duration = 500) {

const[debounced, setdebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => {setdebounced(value)}, duration);
        return () => clearTimeout(id);
    }, [value, duration]);

    return debounced;
}

