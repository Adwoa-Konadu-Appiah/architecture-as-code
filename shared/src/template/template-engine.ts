/* eslint-disable  @typescript-eslint/no-explicit-any */
import Handlebars from 'handlebars';
import { IndexFile, TemplateEntry, CalmTemplateTransformer } from './types.js';
import { TemplateBundleFileLoader } from './template-bundle-file-loader.js';
import { initLogger } from '../logger.js';
import fs from 'fs';
import path from 'path';


export class TemplateEngine {
    private readonly templates: Record<string, Handlebars.TemplateDelegate>;
    private readonly config: IndexFile;
    private transformer: CalmTemplateTransformer;

    constructor(fileLoader: TemplateBundleFileLoader, transformer: CalmTemplateTransformer) {
        this.config = fileLoader.getConfig();
        this.transformer = transformer;
        this.templates = this.compileTemplates(fileLoader.getTemplateFiles());
        this.registerTemplateHelpers();
    }

    private compileTemplates(templateFiles: Record<string, string>): Record<string, Handlebars.TemplateDelegate> {
        const logger = initLogger(process.env.DEBUG === 'true', TemplateEngine.name);
        const compiledTemplates: Record<string, Handlebars.TemplateDelegate> = {};

        for (const [fileName, content] of Object.entries(templateFiles)) {
            compiledTemplates[fileName] = Handlebars.compile(content);
        }

        logger.then(l => (l.log(l.INFO,`✅ Compiled ${Object.keys(compiledTemplates).length} Templates`)));
        return compiledTemplates;
    }

    private registerTemplateHelpers(): void {
        const logger = initLogger(process.env.DEBUG === 'true', TemplateEngine.name);
        logger.then(l => (l.log(l.INFO,'🔧 Registering Handlebars Helpers...')));

        const helperFunctions = this.transformer.registerTemplateHelpers();

        Object.entries(helperFunctions).forEach(([name, fn]) => {
            Handlebars.registerHelper(name, fn);
            logger.then(l => (l.log(l.INFO,`✅ Registered helper: ${name}`)));
        });
    }

    public generate(data: any, outputDir: string): void {
        const logger = initLogger(process.env.DEBUG === 'true', TemplateEngine.name);
        logger.then(l => (l.log(l.INFO,'\n🔹 Starting Template Generation...')));

        if (!fs.existsSync(outputDir)) {
            logger.then(l => (l.log(l.INFO,`📂 Output directory does not exist. Creating: ${outputDir}`)));
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const templateEntry of this.config.templates) {
            this.processTemplate(templateEntry, data, outputDir);
        }

        logger.then(l => (l.log(l.INFO,'\n✅ Template Generation Completed!')));
    }

    private processTemplate(templateEntry: TemplateEntry, data: any, outputDir: string): void {
        const logger = initLogger(process.env.DEBUG === 'true', TemplateEngine.name);
        const { template, from, output, 'output-type': outputType, partials } = templateEntry;

        if (!this.templates[template]) {
            logger.then(l => (l.log(l.WARN,`⚠️ Skipping unknown template: ${template}`)));
            return;
        }

        if (partials) {
            for (const partial of partials) {
                if (this.templates[partial]) {
                    logger.then(l => (l.log(l.INFO,`✅ Registering partial template: ${partial}`)));
                    Handlebars.registerPartial(partial, this.templates[partial]);
                } else {
                    logger.then(l => (l.log(l.WARN,`⚠️ Missing partial template: ${partial}`)));
                }
            }
        }

        const dataSource = data[from];

        if (outputType === 'repeated') {
            if (!Array.isArray(dataSource)) {
                logger.then(l => (l.log(l.WARN,`⚠️ Expected array for repeated output, but found non-array for ${template}`)));
                return;
            }

            for (const instance of dataSource) {
                const filename = output.replace('{{id}}', instance.id);//TODO: Improve output naming for use case.
                const outputPath = path.join(outputDir, filename);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, this.templates[template](instance), 'utf8');
                logger.then(l => (l.log(l.INFO,`✅ Generated: ${outputPath}`)));
            }
        } else if (outputType === 'single') {
            const filename = output.replace('{{id}}', dataSource.id);//TODO: Improve output naming for use case.
            const outputPath = path.join(outputDir, filename);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, this.templates[template](dataSource), 'utf8');
            logger.then(l => (l.log(l.INFO,`✅ Generated: ${outputPath}`)));
        } else {
            logger.then(l => (l.log(l.WARN,`⚠️ Unknown output-type: ${outputType}`)));
        }
    }
}