import * as fs from 'node:fs/promises';
import { initLogger } from '@finos/calm-shared';

export async function loadJsonFromFile(
    path: string,
    debug: boolean
): Promise<object> {
    const logger = await initLogger(debug, 'file-input');
    try {
        logger.log(logger.INFO, 'Loading json from file: ' + path);
        const raw = await fs.readFile(path, 'utf-8');

        logger.log(logger.DEBUG, 'Attempting to load json file: ' + raw);
        const pattern = JSON.parse(raw);

        logger.log(logger.DEBUG, 'Loaded json file.');
        return pattern;
    } catch (err) {
        if (err.code === 'ENOENT') {
            logger.log(logger.ERROR, 'File not found!');
        } else {
            logger.log(logger.ERROR, err);
        }
        throw new Error(err);
    }
}
