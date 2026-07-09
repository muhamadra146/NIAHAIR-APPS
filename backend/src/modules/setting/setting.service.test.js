'use strict';

jest.mock('./setting.repository');

const repo = require('./setting.repository');
const svc  = require('./setting.service');

beforeEach(() => jest.clearAllMocks());

// ── getByKey ───────────────────────────────────────────────────────────

describe('getByKey', () => {
  test('returns setting when found', async () => {
    repo.findByKey.mockResolvedValue({ key: 'some_key', value: 'some_value' });
    const result = await svc.getByKey('some_key');
    expect(result).toEqual({ key: 'some_key', value: 'some_value' });
  });

  test('returns {key, value: null} when setting not found', async () => {
    repo.findByKey.mockResolvedValue(null);
    const result = await svc.getByKey('missing_key');
    expect(result).toEqual({ key: 'missing_key', value: null });
  });
});

// ── upsertSetting ──────────────────────────────────────────────────────

describe('upsertSetting', () => {
  test('calls upsert with stringified value', async () => {
    repo.upsert.mockResolvedValue({ key: 'max_retries', value: '5' });

    await svc.upsertSetting('max_retries', { value: 5, description: 'Max retry count' });
    expect(repo.upsert).toHaveBeenCalledWith('max_retries', '5', 'Max retry count');
  });

  test('converts boolean value to string', async () => {
    repo.upsert.mockResolvedValue({ key: 'feature_flag', value: 'true' });

    await svc.upsertSetting('feature_flag', { value: true });
    expect(repo.upsert).toHaveBeenCalledWith('feature_flag', 'true', undefined);
  });
});

// ── getAllSettings ─────────────────────────────────────────────────────

describe('getAllSettings', () => {
  test('delegates to repo.findAll', async () => {
    repo.findAll.mockResolvedValue([{ key: 'k1', value: 'v1' }]);
    const result = await svc.getAllSettings();
    expect(repo.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
