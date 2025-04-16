import { CalmChoice, selectChoices } from './components/options.js';
import { instantiate } from './components/instantiate';
import { initLogger } from '../../logger.js';

export async function runGenerate(pattern: object, outputPath: string, debug: boolean, chosenChoices?: CalmChoice[], schemaDirectoryPath?: string): Promise<void> {
    const { mkdirp } = await import('mkdirp');
    const path = await import('path');
    const fs = await import('node:fs');
    const logger = await initLogger(debug, 'calm-generate');
    logger.log(logger.INFO,'Generating a CALM architecture...');
    try {
        if (chosenChoices) {
            pattern = await selectChoices(pattern, chosenChoices, debug);
        }

        const final = await instantiate(pattern, debug, schemaDirectoryPath);
        const output = JSON.stringify(final, null, 2);
        const dirname = path.dirname(outputPath); 

        mkdirp.sync(dirname);
        fs.writeFileSync(outputPath, output);
        logger.log(logger.INFO,`Successfully generated architecture to [${outputPath}]`);
    } catch (err) {
        logger.log(logger.DEBUG,'Error while generating architecture from pattern: ' + err.message);
        if (debug) {
            logger.log(logger.DEBUG,err.stack);
        }
    }
}
