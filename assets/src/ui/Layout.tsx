import type { FC, ReactNode } from 'react';

interface LayoutProps {
    title: string;
    children: ReactNode;
    meta?: {
        description?: string;
        keywords?: string;
    };
}

const Layout: FC<LayoutProps> = ({ title, children, meta }) => (
    <html lang="en">
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{title}</title>
            {meta?.description && <meta name="description" content={meta.description} />}
            {meta?.keywords && <meta name="keywords" content={meta.keywords} />}
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                h1 { color: #111; margin-bottom: 1rem; }
                p { margin-bottom: 1rem; }
                code {
                    background: #f4f4f4;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
                a { color: #0066cc; }
            `}</style>
        </head>
        <body>
            {children}
        </body>
    </html>
);

export default Layout;
