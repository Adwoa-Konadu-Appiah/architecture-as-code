import { SchemaDirectory } from './schema-directory';
import { readFile } from 'node:fs/promises';

let schemaDir: SchemaDirectory;

beforeEach(() => {
  schemaDir = new SchemaDirectory();
  (schemaDir as any).logger = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    log: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SchemaDirectory', () => {
  it('loads all specs from given directory including subdirectories', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-03');
    expect(schemaDir.getLoadedSchemas().length).toBe(2);
  });

  it('throws exception when directory does not exist', async () => {
    await expect(schemaDir.loadSchemas('bad-directory')).rejects.toThrow();
  });

  it('loads all specs from 2024-10 directory', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-10');

    const loadedSchemas = schemaDir.getLoadedSchemas();
    expect(loadedSchemas.length).toBe(8);

    const expectedFileNames = [
      'https://calm.finos.org/draft/2024-10/meta/calm.json',
      'https://calm.finos.org/draft/2024-10/meta/control-requirement.json',
      'https://calm.finos.org/draft/2024-10/meta/control.json',
      'https://calm.finos.org/draft/2024-10/meta/core.json',
      'https://calm.finos.org/draft/2024-10/meta/evidence.json',
      'https://calm.finos.org/draft/2024-10/meta/flow.json',
      'https://calm.finos.org/draft/2024-10/meta/interface.json',
      'https://calm.finos.org/draft/2024-10/meta/units.json',
    ];

    expect(loadedSchemas).toEqual(expectedFileNames);
  });

  it('resolves a reference from a loaded schema', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-03');

    const nodeRef = 'https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-03/meta/core.json#/defs/node';
    const nodeDef = schemaDir.getDefinition(nodeRef);

    expect(nodeDef.required).toContain('node-type');
  });

  it('recursively resolves references from a loaded schema', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-04');

    const ref = 'https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-04/meta/interface.json#/defs/host-port-interface';
    const def = schemaDir.getDefinition(ref);

    expect(def.properties).toHaveProperty('host');
    expect(def.properties).toHaveProperty('port');
    expect(def.properties).toHaveProperty('unique-id');
  });

  it('qualifies relative references within same file to absolute IDs', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-04');

    const ref = 'https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-04/meta/interface.json#/defs/rate-limit-interface';
    const def = schemaDir.getDefinition(ref);

    expect(def.properties.key.$ref).toEqual(
      'https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-04/meta/interface.json#/defs/rate-limit-key'
    );
  });

  it('returns warning message if schema is missing', async () => {
    const ref = 'https://raw.githubusercontent.com/finos/architecture-as-code/main/calm/draft/2024-04/meta/interface.json#/defs/host-port-interface';
    const def = schemaDir.getDefinition(ref);

    expect(def.properties).toHaveProperty('missing-value');
    expect(def.properties['missing-value']).toEqual(
      `MISSING OBJECT, ref: ${ref} could not be resolved`
    );
  });

  it('terminates early in the case of a circular reference', async () => {
    await schemaDir.loadSchemas('test_fixtures/recursive_refs');

    const ref = 'https://calm.com/recursive.json#/$defs/top-level';
    const def = schemaDir.getDefinition(ref);

    expect(def.properties).toHaveProperty('top-level');
    expect(def.properties).toHaveProperty('prop');
  });

  it('looks up self-definitions without schema ID from the pattern', async () => {
    await schemaDir.loadSchemas(__dirname + '/../../calm/draft/2024-04');

    const patternStr = await readFile('test_fixtures/api-gateway-self-reference.json', 'utf-8');
    const pattern = JSON.parse(patternStr);

    schemaDir.loadCurrentPatternAsSchema(pattern);
    const def = schemaDir.getDefinition('#/defs/sample-node');

    expect(def.properties).toHaveProperty('extra-prop');
  });
});
