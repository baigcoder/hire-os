import { createContext, useContext } from "react";

/** True inside AppShell, where the old page navbar and footer step aside. */
export const ShellContext = createContext(false);
export const useInShell = () => useContext(ShellContext);
