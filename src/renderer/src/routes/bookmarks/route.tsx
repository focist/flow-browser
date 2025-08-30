import { RouteConfig } from "./config";
import PageComponent from "./page";

export default function Route() {
  console.log('BookmarksRoute: Route component rendering');
  return (
    <RouteConfig.Providers>
      <PageComponent />
    </RouteConfig.Providers>
  );
}