import { CalmCore } from '../model/core.js';
import fs from 'fs';
import { initLogger } from '../logger.js';
import { CalmCoreSchema } from '../types/core-types.js';

export class CalmParser {
    private static loggerPromise = initLogger(process.env.DEBUG === 'true', 'CalmParser');
    private static logger: Awaited<ReturnType<typeof initLogger>>;

    private static async getLogger() {
        if (!CalmParser.logger) {
            CalmParser.logger = await CalmParser.loggerPromise;
        }
        return CalmParser.logger;
    }

    public async parse(coreCalmFilePath: string): Promise<CalmCore> {
        const logger = await CalmParser.getLogger();
        try {
            const data = fs.readFileSync(coreCalmFilePath, 'utf8');
            const dereferencedData: CalmCoreSchema = JSON.parse(data); // TODO: use SchemaDirectory
            dereferencedData.flows = [];
            dereferencedData.controls = {};
            return CalmCore.fromJson(dereferencedData);
        } catch (error) {
            logger.log(logger.ERROR, `❌ Failed to parse calm.json: ${error.message}`);
            throw error;
        }
    }
}

