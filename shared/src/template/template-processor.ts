import fs from 'fs';
import path from 'path';
import { register } from 'ts-node';
import 'source-map-support/register';
import { TemplateEngine } from './template-engine.js';
import { CalmTemplateTransformer, IndexFile } from './types.js';
import { TemplateBundleFileLoader } from './template-bundle-file-loader.js';
import { initLogger } from '../logger.js';
import { TemplateCalmFileDereferencer } from './template-calm-file-dereferencer.js';
import { CompositeReferenceResolver } from '../resolver/calm-reference-resolver.js';
import {pathToFileURL} from 'node:url';
import TemplateDefaultTransformer from './template-default-transformer';


export class TemplateProcessor {
    private readonly inputPath: string;
    private readonly templateBundlePath: string;
    private readonly outputPath: string;
    private readonly urlToLocalPathMapping: Map<string, string>;

    constructor(inputPath: string, templateBundlePath: string, outputPath: string, urlToLocalPathMapping: Map<string, string>) {
        this.inputPath = inputPath;
        this.templateBundlePath = templateBundlePath;
        this.outputPath = outputPath;
        this.urlToLocalPathMapping = urlToLocalPathMapping;
    }

    public async processTemplate(): Promise<void> {
        const logger = await initLogger(process.env.DEBUG === 'true', TemplateProcessor.name);
        const resolvedInputPath = path.resolve(this.inputPath);
        const resolvedBundlePath = path.resolve(this.templateBundlePath);
        const resolvedOutputPath = path.resolve(this.outputPath);
        const calmResolver = new TemplateCalmFileDereferencer(this.urlToLocalPathMapping, new CompositeReferenceResolver());

        const config = new TemplateBundleFileLoader(this.templateBundlePath).getConfig();

        try {
            this.cleanOutputDirectory(resolvedOutputPath, logger);

            const calmJson = this.readInputFile(resolvedInputPath, logger);

            this.validateConfig(config, logger);

            const transformer = await this.loadTransformer(config.transformer, resolvedBundlePath, logger);

            const calmJsonDereferenced = await calmResolver.dereferenceCalmDoc(calmJson);
            const transformedModel = transformer.getTransformedModel(calmJsonDereferenced);

            const templateLoader = new TemplateBundleFileLoader(this.templateBundlePath);
            const engine = new TemplateEngine(templateLoader, transformer);
            engine.generate(transformedModel, resolvedOutputPath);

            logger.log(logger.INFO, '\n✅ Template Generation Completed!');
        } catch (error) {
            logger.log(logger.ERROR, `❌ Error generating template: ${error.message}`);
            throw new Error(`❌ Error generating template: ${error.message}`);
        }
    }

    private cleanOutputDirectory(outputPath: string, logger: any): void {
        if (fs.existsSync(outputPath)) {
            logger.log(logger.INFO, '🗑️ Cleaning up previous generation...');
            fs.rmSync(outputPath, { recursive: true, force: true });
        }
        fs.mkdirSync(outputPath, { recursive: true });
    }

    private readInputFile(inputPath: string, logger: any): string {
        if (!fs.existsSync(inputPath)) {
            logger.log(logger.ERROR, `❌ CALM model file not found: ${inputPath}`);
            throw new Error(`CALM model file not found: ${inputPath}`);
        }
        return fs.readFileSync(inputPath, 'utf8');
    }

    private validateConfig(config: IndexFile, logger: any): void {
        if (config.transformer) {
            const tsPath = path.join(this.templateBundlePath, `${config.transformer}.ts`);
            const jsPath = path.join(this.templateBundlePath, `${config.transformer}.js`);

            const tsExists = fs.existsSync(tsPath);
            const jsExists = fs.existsSync(jsPath);

            if (!tsExists && !jsExists) {
                const errorMsg = `Transformer "${config.transformer}" specified in index.json but not found as .ts or .js in ${this.templateBundlePath}`;
                logger.log(logger.ERROR, `❌ ${errorMsg}`);
                throw new Error(`❌ ${errorMsg}`);
            }
        } else {
            logger.log(logger.INFO, 'ℹ️ No transformer specified in index.json. Will use TemplateDefaultTransformer.');
        }
    }

    private async loadTransformer(transformerName: string, bundlePath: string, logger: any): Promise<CalmTemplateTransformer> {
        if (!transformerName) {
            logger.log(logger.INFO, '🔁 No transformer provided. Using TemplateDefaultTransformer.');
            return new TemplateDefaultTransformer();
        }

        const transformerFileTs = path.join(bundlePath, `${transformerName}.ts`);
        const transformerFileJs = path.join(bundlePath, `${transformerName}.js`);
        let transformerFilePath: string | null = null;

        if (fs.existsSync(transformerFileTs)) {
            logger.log(logger.INFO, `🔍 Loading transformer as TypeScript: ${transformerFileTs}`);
            register({
                transpileOnly: true,
                compilerOptions: {
                    target: 'es2021',
                    module: 'commonjs',
                    moduleResolution: 'node',
                    esModuleInterop: true,
                    sourceMap: true,
                    inlineSourceMap: true,
                    inlineSources: true,
                },
            });
            transformerFilePath = transformerFileTs;
        } else if (fs.existsSync(transformerFileJs)) {
            logger.log(logger.INFO, `🔍 Loading transformer as JavaScript: ${transformerFileJs}`);
            transformerFilePath = transformerFileJs;
        } else {
            logger.log(logger.ERROR, `❌ Transformer file not found: ${transformerFileTs} or ${transformerFileJs}`);
            throw new Error(`❌ Transformer file not found: ${transformerFileTs} or ${transformerFileJs}`);
        }

        try {
            const url = pathToFileURL(transformerFilePath).href;
            const mod = await import(url);
            const TransformerClass = mod.default;
            if (typeof TransformerClass !== 'function') {
                throw new Error('❌ TransformerClass is not a constructor. Did you forget to export default?');
            }
            return new TransformerClass();
        } catch (error) {
            logger.log(logger.ERROR, `❌ Error loading transformer: ${error.message}`);
            throw new Error(`❌ Error loading transformer: ${error.message}`);
        }
    }
}
