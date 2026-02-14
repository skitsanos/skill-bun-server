import Layout from '@/ui/Layout';

const HomePage = ({request}: { request: Request }) =>
{
    const url = new URL(request.url);

    return (
        <Layout
            title="Welcome to Bun Server"
            meta={{
                description: 'A high-performance web server built with Bun'
            }}>
            <h1>Welcome to Bun Server</h1>
            <p>
                Your server is running at <code>{url.origin}</code>
            </p>
            <p>
                Edit files in <code>src/routes/</code> to add new pages and API endpoints.
            </p>
            <h2>Quick Links</h2>
            <ul>
                <li><a href="/api/health">Health Check API</a></li>
            </ul>
        </Layout>
    );
};

export default HomePage;
