import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import Header from '../components/Header';

import appCss from '../styles.css?url';

export const Route = createRootRoute({
    head : () => ({
        meta : [
            {
                charSet : 'utf-8'
            },
            {
                name    : 'viewport',
                content : 'width=device-width, initial-scale=1'
            },
            {
                title : 'TanStack Start Starter'
            }
        ],
        links : [
            {
                rel  : 'stylesheet',
                href : appCss
            }
        ]
    }),

    shellComponent    : RootDocument,
    notFoundComponent : NotFound
});

function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
                <p className="text-xl text-slate-600 mb-8">Page not found</p>
                <Link
                    to="/scheduler"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go to Scheduler
                </Link>
            </div>
        </div>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <Header />
                {children}
                <TanStackDevtools
                    config={{
                        position : 'bottom-right'
                    }}
                    plugins={[
                        {
                            name   : 'Tanstack Router',
                            render : <TanStackRouterDevtoolsPanel />
                        }
                    ]}
                />
                <Scripts />
            </body>
        </html>
    );
}
