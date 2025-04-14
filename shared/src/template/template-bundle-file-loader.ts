import fs from 'fs';
import path from 'path';
import { IndexFile } from './types.js';
import { initLogger } from '../logger.js';

export class TemplateBundleFileLoader {
    private readonly templateBundlePath: string;
    private config: IndexFile;  // Changed to allow async assignment
    private templateFiles: Record<string, string>;  // Changed to allow async assignment
    
    constructor(templateBundlePath: string) {
        this.templateBundlePath = templateBundlePath;
    }

    private async loadConfig(): Promise<IndexFile> {
        const logger = await initLogger(process.env.DEBUG === 'true', TemplateBundleFileLoader.name);

        const indexFilePath = path.join(this.templateBundlePath, 'index.json');

        if (!fs.existsSync(indexFilePath)) {
            logger.log(logger.ERROR, `❌ index.json not found: ${indexFilePath}`);
            throw new Error(`index.json not found in template bundle: ${indexFilePath}`);
        }

        try {
            logger.log(logger.INFO, `📥 Loading index.json from ${indexFilePath}`);
            const rawConfig = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));

            if (!rawConfig.name || !Array.isArray(rawConfig.templates)) {
                logger.log(logger.ERROR, '❌ Invalid index.json format: Missing required fields');
                throw new Error('Invalid index.json format: Missing required fields');
            }

            logger.log(logger.INFO, `✅ Successfully loaded template bundle: ${rawConfig.name}`);
            return rawConfig as IndexFile;
        } catch (error) {
            logger.log(logger.ERROR, `❌ Error reading index.json: ${error.message}`);
            throw new Error(`Failed to parse index.json: ${error.message}`);
        }
    }

    private async loadTemplateFiles(): Promise<Record<string, string>> {
        const logger = await initLogger(process.env.DEBUG === 'true', TemplateBundleFileLoader.name);

        const templates: Record<string, string> = {};
        const templateDir = this.templateBundlePath;

        logger.log(logger.INFO, `📂 Loading template files from: ${templateDir}`);

        const templateFiles = fs.readdirSync(templateDir).filter(file => file.includes('.'));

        for (const file of templateFiles) {
            const filePath = path.join(templateDir, file);
            templates[file] = fs.readFileSync(filePath, 'utf8');
            logger.log(logger.DEBUG, `✅ Loaded template file: ${file}`);
        }

        logger.log(logger.INFO, `🎯 Total Templates Loaded: ${Object.keys(templates).length}`);
        return templates;
    }

    public async initialize() {
        this.config = await this.loadConfig();  // Await config loading
        this.templateFiles = await this.loadTemplateFiles();  // Await template files loading
    }

    public getConfig(): IndexFile {
        return this.config;
    }

    public getTemplateFiles(): Record<string, string> {
        return this.templateFiles;
    }
}
