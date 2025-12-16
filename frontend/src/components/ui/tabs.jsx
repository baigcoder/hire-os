import * as React from "react";

const TabsContext = React.createContext();

export function Tabs({ defaultValue, children }) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }) {
  return <div className={"flex gap-2 " + (className || "")}>{children}</div>;
}

export function TabsTrigger({ value, children, className }) {
  const { value: selected, setValue } = React.useContext(TabsContext);
  return (
    <button
      className={
        "px-4 py-2 rounded " +
        (selected === value ? "bg-blue-500 text-white " : "bg-gray-200 ") +
        (className || "")
      }
      onClick={() => setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }) {
  const { value: selected } = React.useContext(TabsContext);
  if (selected !== value) return null;
  return <div className="mt-4">{children}</div>;
}