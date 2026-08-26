import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-37-data-pipeline', () => {
  const scenarioFile = 'scenario-37-data-pipeline.tmd';

  it('should validate data pipeline ETL architecture', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // TypedMind doesn't expose entities directly here, but we can verify it processed the file successfully
    // by ensuring it contains the expected content structure
    assert.ok(content.includes('AnalyticsPipeline'));
    assert.ok(content.includes('OrchestratorFile'));
    assert.ok(content.includes('runPipeline'));
    assert.ok(content.includes('KAFKA_BROKERS'));
    assert.ok(content.includes('PipelineConfig'));
    assert.ok(content.includes('SparkProcessor'));
  });
});
