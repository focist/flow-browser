import { ThemeProvider } from "@/components/main/theme";
import { RouteConfigType } from "@/types/routes";
import { ReactNode } from "react";
import { Toaster } from "sonner";

export const RouteConfig: RouteConfigType = {
  Providers: ({ children }: { children: ReactNode }) => {
    return (
      <ThemeProvider forceTheme="dark">
        {children}
        <Toaster />
      </ThemeProvider>
    );
  },
  Fallback: null
};