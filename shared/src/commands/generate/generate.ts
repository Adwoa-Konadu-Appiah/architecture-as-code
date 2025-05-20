import { CalmChoice, selectChoices } from './components/options.js';
import { instantiate } from './components/instantiate';
import { initLogger } from '../../logger.js';
import { SchemaDirectory } from '../../schema-directory.js';

export async function runGenerate(pattern: object, outputPath: string, debug: boolean, schemaDirectory?: SchemaDirectory, chosenChoices?: CalmChoice[]): Promise<void> {
    const fs = await import('fs');
    const path = await import('node:path')
    const mkdirp = await import('mkdirp')

    const logger = initLogger(debug, 'calm-generate');
    logger.info('Generating a CALM architecture...');
    try {
        if (chosenChoices) {
            pattern = selectChoices(pattern, chosenChoices, debug);
        }

        const final = await instantiate(pattern, debug, schemaDirectory);
        const output = JSON.stringify(final, null, 2);
        const dirname = path.dirname(outputPath); 

        mkdirp.sync(dirname);
        fs.writeFileSync(outputPath, output);
        logger.info(`Successfully generated architecture to [${outputPath}]`);
    } catch (err) {
        logger.debug('Error while generating architecture from pattern: ' + err.message);
        if (debug) {
            logger.debug(err.stack);
        }
    }
}


export async function runGenerateArcitecture(pattern: object, debug: boolean, schemaDirectory?: SchemaDirectory, chosenChoices?: CalmChoice[]): Promise<string> {
    const logger = initLogger(debug, 'calm-generate');
    logger.info('Generating a CALM architecture...');
    try {
        if (chosenChoices) {
            pattern = selectChoices(pattern, chosenChoices, debug);
        }

        const final = await instantiate(pattern, debug, schemaDirectory);
        const output = JSON.stringify(final, null, 2);

        logger.info(`Successfully generated architecture to `);
        return output
    } catch (err) {
        logger.debug('Error while generating architecture from pattern: ' + err.message);
        if (debug) {
            logger.debug(err.stack);
        }
    }
}
