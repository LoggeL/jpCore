import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('health routes', () => {
  it('returns ok from the root route', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/' });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('keeps /api/health working', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});
