// import * as fs from 'node:fs';
// import * as path from 'node:path';
// import {mkdirp} from 'mkdirp';

import { CalmChoice, selectChoices } from './components/options.js';
import { instantiate } from './components/instantiate';
// import { initLogger, LoggerL } from '../../logger';

export async function runGenerate(pattern: object, chosenChoices?: CalmChoice[], schemaDirectoryPath?: string): Promise<any> {
    // const logger = initLogger(debug, 'calm-generate');
    try {
        if (chosenChoices) {
            pattern = selectChoices(pattern, chosenChoices);
        }

        const final = await instantiate(pattern, schemaDirectoryPath);
        console.log(final)
        // const output = JSON.stringify(final);
        // const dirname = path.dirname(outputPath);

        // mkdirp.sync(dirname);
        // fs.writeFileSync(outputPath, output);
        // console.log(output);
        return final;
    }
    catch (err) {
        // logger.debug('Error while generating architecture from pattern: ' + err.message);
        // if (debug) {
        //     logger.debug(err.stack);
        // }
        console.log(err.message);
    }
}
