import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupAuthInterceptor, _resetInterceptorRegisteredForTesting } from './apiClient';

describe('setupAuthInterceptor', () => {
    let mockInterceptor: (req: any) => Promise<any>;
    let mockClient: any;

    beforeEach(() => {
        _resetInterceptorRegisteredForTesting();
        mockInterceptor = null as any;
        mockClient = {
            interceptors: {
                request: {
                    use: vi.fn((fn) => {
                        mockInterceptor = fn;
                    }),
                },
            },
        };
    });

    it('attaches Bearer token when getAccessToken succeeds immediately', async () => {
        const getAccessToken = vi.fn().mockResolvedValue('test-token-123');
        setupAuthInterceptor(mockClient, getAccessToken);

        const request = {
            headers: new Headers(),
        };

        const result = await mockInterceptor(request);
        expect(result.headers.get('Authorization')).toBe('Bearer test-token-123');
        expect(getAccessToken).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite existing Authorization header', async () => {
        const getAccessToken = vi.fn().mockResolvedValue('test-token-123');
        setupAuthInterceptor(mockClient, getAccessToken);

        const request = {
            headers: new Headers({ Authorization: 'Bearer existing-token' }),
        };

        const result = await mockInterceptor(request);
        expect(result.headers.get('Authorization')).toBe('Bearer existing-token');
        expect(getAccessToken).not.toHaveBeenCalled();
    });

    it('retries when token retrieval initially throws and recovers on second try', async () => {
        const getAccessToken = vi
            .fn()
            .mockRejectedValueOnce(new Error('User not authenticated'))
            .mockResolvedValueOnce('retry-success-token');

        setupAuthInterceptor(mockClient, getAccessToken);

        const request = {
            headers: new Headers(),
        };

        const result = await mockInterceptor(request);
        expect(result.headers.get('Authorization')).toBe('Bearer retry-success-token');
        expect(getAccessToken).toHaveBeenCalledTimes(2);
    });

    it('gracefully proceeds without Authorization if all retries fail', async () => {
        const getAccessToken = vi.fn().mockRejectedValue(new Error('Persistent auth error'));

        setupAuthInterceptor(mockClient, getAccessToken);

        const request = {
            headers: new Headers(),
        };

        const result = await mockInterceptor(request);
        expect(result.headers.get('Authorization')).toBeNull();
        expect(getAccessToken).toHaveBeenCalledTimes(3);
    });
});
