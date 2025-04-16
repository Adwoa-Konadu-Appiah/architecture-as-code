import fs from 'fs';
import path from 'path';
import { TemplateProcessor } from './template-processor';
import { CalmTemplateTransformer, IndexFile } from './types';
import { Mock } from 'vitest';

vi.mock('fs');

const fakeConfig: IndexFile = {
    name: 'Test Bundle',
    transformer: 'mock-transformer',
    templates: [
        { template: 'main.hbs', from: 'data', output: 'output.txt', 'output-type': 'single' },
        { template: 'main.hbs', from: 'users', output: '{{id}}.txt', 'output-type': 'repeated' }
    ]
};

const fakeTemplateFiles = {
    'main.hbs': 'User: {{name}}'
};

const mockTemplateLoader = {
    getConfig: vi.fn().mockReturnValue(fakeConfig),
    getTemplateFiles: vi.fn().mockReturnValue(fakeTemplateFiles),
};

vi.mock('./template-bundle-file-loader', () => ({
    TemplateBundleFileLoader: vi.fn().mockImplementation(() => mockTemplateLoader)
}));

const mockTemplateEngine = {
    generate: vi.fn()
};

vi.mock('./template-engine', () => ({
    TemplateEngine: vi.fn().mockImplementation(() => mockTemplateEngine)
}));

const mockDereferencer = {
    dereferenceCalmDoc: vi.fn().mockResolvedValue('{"some": "dereferencedData"}')
};

vi.mock('./template-calm-file-dereferencer', () => ({
    TemplateCalmFileDereferencer: vi.fn().mockImplementation(() => mockDereferencer),
    FileReferenceResolver: vi.fn()
}));


describe('TemplateProcessor', () => {
    let mockTransformer: ReturnType<typeof vi.mocked<CalmTemplateTransformer>>;
    let loggerLogSpy: ReturnType<typeof vi.spyOn>;
    let mockLogger: Logger;

    beforeEach(async () => {
        mockTransformer = {
            registerTemplateHelpers: vi.fn().mockReturnValue({}),
            getTransformedModel: vi.fn().mockReturnValue({ transformed: true }),
        } as unknown as ReturnType<typeof vi.mocked<CalmTemplateTransformer>>;

        mockLogger = await TemplateProcessor["logger"];

        loggerLogSpy = vi.spyOn(mockLogger, 'log').mockImplementation(vi.fn());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(TemplateProcessor.prototype as any, 'loadTransformer').mockReturnValue(mockTransformer);

        (fs.existsSync as Mock).mockImplementation((filePath: string) => {
            return !filePath.includes('missing');
        });
        (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
            if (filePath.includes('simple-nodes.json')) return '{"some": "data"}';
            return '';
        });
        (fs.rmSync as Mock).mockImplementation(() => {});
        (fs.mkdirSync as Mock).mockImplementation(() => {});
    });

    it('should successfully process a template', async () => {
        const processor = new TemplateProcessor('simple-nodes.json', 'bundle', 'output', new Map<string, string>());
        await processor.processTemplate();
        expect(loggerLogSpy).toHaveBeenCalledWith(mockLogger.INFO,expect.stringContaining('🗑️ Cleaning up previous generation...'));
        expect(loggerLogSpy).toHaveBeenCalledWith(mockLogger.INFO,expect.stringContaining('✅ Template Generation Completed!'));
        expect(mockTemplateEngine.generate).toHaveBeenCalled();
        expect(mockTransformer.getTransformedModel).toHaveBeenCalledWith('{"some": "dereferencedData"}');
    });

    it('should throw an error if the input file is missing', async () => {
        (fs.existsSync as Mock).mockImplementation((filePath: string) => {
            return !filePath.includes('simple-nodes.json');
        });
        const processor = new TemplateProcessor('simple-nodes.json', 'bundle', 'output', new Map<string, string>());
        await expect(processor.processTemplate()).rejects.toThrow('CALM model file not found: ' + path.resolve('simple-nodes.json'));
        expect(loggerLogSpy).toHaveBeenCalledWith(mockLogger.ERROR, expect.stringContaining('❌ CALM model file not found'));
    });

    it('should throw an error if loadTransformer fails', async () => {
        const configWithBadTransformer = {
            name: 'Test Bundle',
            templates: [],
            transformer: 'NonExistentTransformer'
        };
        mockTemplateLoader.getConfig.mockReturnValue(configWithBadTransformer);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.spyOn(TemplateProcessor.prototype as any, 'loadTransformer').mockImplementation(() => {
            throw new Error('TransformerClass is undefined.');
        });
        const processor = new TemplateProcessor('simple-nodes.json', 'bundle', 'output', new Map<string, string>());
        await expect(processor.processTemplate()).rejects.toThrow('❌ Error generating template: TransformerClass is undefined.');
        expect(loggerLogSpy).toHaveBeenCalledWith(mockLogger.ERROR, expect.stringContaining('❌ Error generating template: TransformerClass is undefined.'));
    });

    it('should pass the urlToLocalPathMapping to the TemplateCalmFileRefResolver', async () => {
        const mapping = new Map<string, string>([['http://example.com/file', '/local/path/file']]);
        const processor = new TemplateProcessor('simple-nodes.json', 'bundle', 'output', mapping);
        await processor.processTemplate();
        const { TemplateCalmFileDereferencer } = await vi.importMock('./template-calm-file-dereferencer');
        expect(TemplateCalmFileDereferencer).toHaveBeenCalledWith(mapping, expect.anything());
    });

    it('should throw an error if dereferencing the CALM doc fails', async () => {
        (mockDereferencer.dereferenceCalmDoc as Mock).mockRejectedValue(new Error('Dereference failed'));
        const processor = new TemplateProcessor('simple-nodes.json', 'bundle', 'output', new Map<string, string>());
        await expect(processor.processTemplate()).rejects.toThrow('Dereference failed');
        expect(loggerLogSpy).toHaveBeenCalledWith(mockLogger.ERROR, expect.stringContaining('Dereference failed'));
    });
});