import app from './src/server.js';
import prisma from './src/config/prisma.js';

const PORT = process.env.PORT || 3001;

async function start() {
    try {
        // Fail fast with a clear message if the database is unreachable.
        await prisma.$connect();
        console.log('✓ Database connected');
    } catch (error) {
        console.error('✗ Could not connect to the database.');
        console.error('  Check that PostgreSQL is running and DATABASE_URL in backend/.env is correct.');
        console.error('  Details:', error.message);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`✓ Server running on http://localhost:${PORT}`);
    });
}

start();
