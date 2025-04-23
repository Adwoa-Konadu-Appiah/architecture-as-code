import express, { Application } from 'express';
import { CLIServerRoutes } from './routes/routes';
import { initLogger } from '@finos/calm-shared';

export function startServer(options: {
    port: string;
    schemaDirectory: string;
    verbose: boolean;
}) {
    const app: Application = express();
    const cliServerRoutesInstance = new CLIServerRoutes(
        options.schemaDirectory,
        options.verbose
    );
    const allRoutes = cliServerRoutesInstance.router;

    app.use(express.json());
    app.use('/', allRoutes);

    const port = options.port;

    app.listen(port, async () => {
        const logger = await initLogger(options.verbose, 'calm-server');
        logger.log(
            logger.INFO,
            `CALM Server is running on http://localhost:${port}`
        );
    });
}
