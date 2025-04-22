import { TemplateEngine } from './template-engine';
import { TemplateBundleFileLoader } from './template-bundle-file-loader';
import { CalmTemplateTransformer, IndexFile } from './types';
import fs from 'fs';
import path from 'path';
import { vi } from 'vitest';
vi.mock('fs');

const mockLogger = {
    INFO: 0,
    DEBUG: 1,
    WARN: 2,
    ERROR: 3,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

vi.mock('../logger.js', () => ({
    initLogger: vi.fn(() => Promise.resolve(mockLogger)),
}));

describe('TemplateEngine', () => {
    let mockFileLoader: ReturnType<typeof vi.mocked<TemplateBundleFileLoader>>;
    let mockTransformer: ReturnType<typeof vi.mocked<CalmTemplateTransformer>>;

    beforeEach(async () => {
        mockFileLoader = {
            getConfig: vi.fn(),
            getTemplateFiles: vi.fn(),
        } as unknown as ReturnType<typeof vi.mocked<TemplateBundleFileLoader>>;

        mockTransformer = {
            registerTemplateHelpers: vi.fn().mockReturnValue({}),
            getTransformedModel: vi.fn(),
        } as unknown as ReturnType<typeof vi.mocked<CalmTemplateTransformer>>;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('should log compiled templates', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        new TemplateEngine(mockFileLoader, mockTransformer);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.INFO,
            '✅ Compiled 1 Templates'
        );
    });

    it('should register template helpers', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        mockTransformer.registerTemplateHelpers.mockReturnValue({
            uppercase: (str: string) => str.toUpperCase(),
        });

        new TemplateEngine(mockFileLoader, mockTransformer);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.INFO,
            '🔧 Registering Handlebars Helpers...'
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.INFO,
            '✅ Registered helper: uppercase'
        );
    });

    it('should log a warning for an unknown template', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'unknown.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                },
            ],
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue({});

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);
        engine.generate({}, '/output');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.WARN,
            '⚠️ Skipping unknown template: unknown.hbs'
        );
    });

    it('should handle repeated output templates', () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'users',
                    output: '{{id}}.txt',
                    'output-type': 'repeated',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        const mkdirSyncSpy = vi
            .spyOn(fs, 'mkdirSync')
            .mockImplementation(() => undefined);
        const writeFileSyncSpy = vi
            .spyOn(fs, 'writeFileSync')
            .mockImplementation(() => {});

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);

        const userData = {
            users: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
            ],
        };

        engine.generate(userData, '/output');

        expect(mkdirSyncSpy).toHaveBeenCalledWith('/output', {
            recursive: true,
        });
        expect(mkdirSyncSpy).toHaveBeenCalledWith(
            path.dirname('/output/1.txt'),
            { recursive: true }
        );
        expect(mkdirSyncSpy).toHaveBeenCalledWith(
            path.dirname('/output/2.txt'),
            { recursive: true }
        );
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            '/output/1.txt',
            'User: Alice',
            'utf8'
        );
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            '/output/2.txt',
            'User: Bob',
            'utf8'
        );
    });

    it('should handle single output templates', () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        const mkdirSyncSpy = vi
            .spyOn(fs, 'mkdirSync')
            .mockImplementation(() => undefined);
        const writeFileSyncSpy = vi
            .spyOn(fs, 'writeFileSync')
            .mockImplementation(() => {});

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);

        const testData = { data: { id: '123', name: 'Alice' } };

        engine.generate(testData, '/output');

        expect(mkdirSyncSpy).toHaveBeenCalledWith('/output', {
            recursive: true,
        });
        expect(mkdirSyncSpy).toHaveBeenCalledWith(
            path.dirname('/output/output.txt'),
            { recursive: true }
        );
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            '/output/output.txt',
            'User: Alice',
            'utf8'
        );
    });

    it('should log a warning when registering a missing partial template', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                    partials: ['header.hbs'],
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);
        engine.generate({ data: { name: 'Alice' } }, '/output');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.WARN,
            expect.stringContaining('⚠️ Missing partial template: header.hbs')
        );
    });

    it('should log a warning for non-array input when expecting repeated output', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'repeated',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);
        engine.generate({ data: { id: '1', name: 'Alice' } }, '/output');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.WARN,
            expect.stringContaining(
                '⚠️ Expected array for repeated output, but found non-array for main.hbs'
            )
        );
    });

    it('should log a warning for an unknown output type', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'invalid-type',
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);
        engine.generate({ data: { id: '1', name: 'Alice' } }, '/output');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.WARN,
            expect.stringContaining('⚠️ Unknown output-type: invalid-type')
        );
    });

    it('should log when registering a partial template', async () => {
        const templateConfig: IndexFile = {
            name: 'Test Template',
            transformer: 'mock-transformer',
            templates: [
                {
                    template: 'main.hbs',
                    from: 'data',
                    output: 'output.txt',
                    'output-type': 'single',
                    partials: ['header.hbs'],
                },
            ],
        };

        const templateFiles = {
            'main.hbs': 'User: {{name}}',
            'header.hbs': '<h1>{{title}}</h1>',
        };

        mockFileLoader.getConfig.mockReturnValue(templateConfig);
        mockFileLoader.getTemplateFiles.mockReturnValue(templateFiles);

        const engine = new TemplateEngine(mockFileLoader, mockTransformer);
        engine.generate({ data: { name: 'Alice' } }, '/output');
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockLogger.log).toHaveBeenCalledWith(
            mockLogger.INFO,
            expect.stringContaining(
                '✅ Registering partial template: header.hbs'
            )
        );
    });
});
