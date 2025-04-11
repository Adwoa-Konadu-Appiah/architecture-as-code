import { CalmChoice, selectChoices } from './components/options.js';
import { instantiate } from './components/instantiate';
import { initLogger } from '../../logger.js';

export async function runGenerate(pattern: object, outputPath: string, debug: boolean, chosenChoices?: CalmChoice[], schemaDirectoryPath?: string): Promise<void> {
    const mkdirp = require("mkdirp")
    const fs = require('node:fs');
    const path = require('node:path');
    const logger = initLogger(debug, 'calm-generate');
    try {
        if (chosenChoices) {
            pattern = selectChoices(pattern, chosenChoices, debug);
        }

        const final = await instantiate(pattern, debug, schemaDirectoryPath);
        const output = JSON.stringify(final, null, 2);
        const dirname = path.dirname(outputPath);

        mkdirp.sync(dirname);
        fs.writeFileSync(outputPath, output);
    }
    catch (err) {
        (await logger).log((await logger).DEBUG, 'Error while generating architecture from pattern: ' + err.message);
        if (debug) {
            (await logger).log((await logger).DEBUG, err.stack);
        }
    }
}

export async function generateArcitectureInstanceFromPattern(pattern: object,  debug: boolean): Promise<string>{
    const logger = initLogger(debug, 'calm-generate');
    try {
        const final = await instantiate(pattern, debug);
        console.log(final);
        const output = JSON.stringify(final);
        return output;
    }
    catch (err) {
        (await logger).log((await logger).DEBUG, 'Error while generating architecture from pattern: ' + err.message);
        if (debug) {
            (await logger).log((await logger).DEBUG, err.stack);
        }
    }
}
