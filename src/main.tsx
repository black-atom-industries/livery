import { createRoot } from "react-dom/client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";
import "./index.css";

const queryClient = new QueryClient({
    defaultOptions: {
        mutations: {
            meta: { autoInvalidate: true },
        },
    },
    mutationCache: new MutationCache({
        onSuccess: async (_data, _variables, _context, mutation) => {
            if (!mutation.meta?.autoInvalidate) return;
            if (mutation.options.mutationKey) {
                const mainTopic = mutation.options.mutationKey[0];
                await queryClient.invalidateQueries({ queryKey: [mainTopic] });
            }
        },
    }),
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
    </QueryClientProvider>,
);
