import { CalmChoice, selectChoices } from './components/options.js';
import { instantiate } from './components/instantiate';
import { initLogger } from '../../logger.js';

export async function runGenerate(
    pattern: object,
    outputPath: string,
    debug: boolean,
    chosenChoices?: CalmChoice[],
    schemaDirectoryPath?: string
  ): Promise<void> {
    const mkdirp = require('mkdirp');
    const fs = require('node:fs');
    const path = require('node:path');
  
    const logger = await initLogger(debug, 'calm-generate'); 
    logger.log(logger.INFO, 'Generating a CALM architecture...');
  
    try {
      if (chosenChoices) {
        pattern = selectChoices(pattern, chosenChoices, debug);
      }
  
      const final = await instantiate(pattern, debug, schemaDirectoryPath);
      const output = JSON.stringify(final, null, 2);
      const dirname = path.dirname(outputPath);
  
      mkdirp.sync(dirname);
      fs.writeFileSync(outputPath, output);
      logger.log(logger.INFO, `Successfully generated architecture to [${outputPath}]`);
    } 
    catch (err) {
      logger.log(logger.DEBUG, 'Error while generating architecture from pattern: ' + err.message);
      if (debug) {
        logger.log(logger.DEBUG, err.stack);
      }
    }
  }
  
  export async function generateArcitectureInstanceFromPattern(
    pattern: object,
    debug: boolean
  ): Promise<string> {
    const logger = await initLogger(debug, 'calm-generate');
    try {
      const final = await instantiate(pattern, debug);
      console.log(final);
      return JSON.stringify(final);
    } 
    catch (err) {
      logger.log(logger.DEBUG, 'Error while generating architecture from pattern: ' + err.message);
      if (debug) {
        logger.log(logger.DEBUG, err.stack);
      }
    }
  }
  