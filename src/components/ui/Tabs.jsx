// src/components/ui/Tabs.jsx
import React, { createContext, useContext, useMemo, useState, useId } from "react";
import { cn } from "../../utils/cn";

// ---------------- Context ----------------
const TabsCtx = createContext(null);
const useTabs = () => {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("Tabs components must be used inside <Tabs>.");
  return ctx;
};

// --------------- Root --------------------
function TabsRoot({ children, defaultValue, value, onValueChange, className = "" }) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);

  const active = isControlled ? value : internal;

  const setActive = (next) => {
    if (onValueChange) onValueChange(next);
    if (!isControlled) setInternal(next);
  };

  const ctx = useMemo(() => ({ active, setActive }), [active]);

  return (
    <TabsCtx.Provider value={ctx}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsCtx.Provider>
  );
}

// --------------- List --------------------
function TabsList({ children, className = "", ...rest }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

// ------------- Trigger -------------------
function TabsTrigger({ children, value, className = "", ...rest }) {
  const { active, setActive } = useTabs();
  const isActive = active === value;
  const baseId = useId();
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      type="button"
      id={tabId}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      onClick={() => setActive(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-white text-gray-950 shadow-sm" : "text-gray-600 hover:text-gray-900",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ------------- Content -------------------
function TabsContent({ children, value, className = "", ...rest }) {
  const { active } = useTabs();
  const baseId = useId();
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (active !== value) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---------- Attach subcomponents ----------
const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});

export default Tabs;
export { Tabs, TabsList, TabsTrigger, TabsContent };
