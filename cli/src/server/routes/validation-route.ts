import { SchemaDirectory, initLogger, validate } from '@finos/calm-shared';
import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { ValidationOutcome } from '@finos/calm-shared';
import rateLimit from 'express-rate-limit';

export class ValidationRouter {
    private schemaDirectoryPath: string;
    private schemaDirectory: SchemaDirectory;
    private debug;

    constructor(
        router: Router,
        schemaDirectoryPath: string,
        debug: boolean = false
    ) {
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
        });
        this.schemaDirectoryPath = schemaDirectoryPath;
        this.debug = debug;
        router.use(limiter);
        this.initializeRoutes(router);
    }

    private initializeRoutes(router: Router) {
        router.post('/', this.validateSchema);
    }

    private validateSchema = async (
        req: Request<ValidationRequest>,
        res: Response<ValidationOutcome | ErrorResponse>
    ) => {
        this.schemaDirectory = await SchemaDirectory.init(this.debug);
        let architecture;
        const logger = await initLogger(this.debug, 'calm-server');
        try {
            architecture = JSON.parse(req.body.architecture);
        } catch (error) {
            logger.log(
                logger.ERROR,
                'Invalid JSON format for architecture ' + error
            );
            return res
                .status(400)
                .type('json')
                .send(
                    new ErrorResponse('Invalid JSON format for architecture')
                );
        }

        const schema = architecture['$schema'];
        if (!schema) {
            return res
                .status(400)
                .type('json')
                .send(
                    new ErrorResponse(
                        'The "$schema" field is missing from the request body'
                    )
                );
        }
        logger.log(
            logger.INFO,
            'Path loading schemas is ' + this.schemaDirectoryPath
        );

        await this.schemaDirectory.loadSchemas(this.schemaDirectoryPath);
        const foundSchema = this.schemaDirectory.getSchema(schema);
        if (!foundSchema) {
            return res
                .status(400)
                .type('json')
                .send(
                    new ErrorResponse(
                        'The "$schema" field referenced is not available to the server'
                    )
                );
        }
        const tempInstantiation = await createTemporaryFile();
        const tempPattern = await createTemporaryFile();
        try {
            await fs.writeFile(
                tempInstantiation,
                JSON.stringify(architecture, null, 4),
                { mode: 0o600 }
            );
            await fs.writeFile(
                tempPattern,
                JSON.stringify(foundSchema, null, 4),
                { mode: 0o600 }
            );
            const outcome = await validate(
                tempInstantiation,
                tempPattern,
                this.schemaDirectoryPath,
                true
            );
            return res.status(201).type('json').send(outcome);
        } catch (error) {
            return res
                .status(500)
                .type('json')
                .send(new ErrorResponse(error.message));
        } finally {
            [tempInstantiation, tempPattern].forEach((element) => {
                fs.unlink(element).catch(() => {
                    logger.log(
                        logger.WARN,
                        'Failed to delete temporary file ' + element
                    );
                });
            });
        }
    };
}

async function createTemporaryFile(): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'calm-'));
    const tempFilePath = path.join(
        tempDir,
        `calm-instantiation-${uuidv4()}.json`
    );
    return tempFilePath;
}

class ErrorResponse {
    error: string;
    constructor(error: string) {
        this.error = error;
    }
}

class ValidationRequest {
    architecture: string;
}
