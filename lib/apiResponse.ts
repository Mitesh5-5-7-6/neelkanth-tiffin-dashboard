import { NextResponse } from 'next/server';
import type { ApiSuccess, ApiError, PaginationMeta } from '@/types/common.types';

export function success<T>(data: T, message = 'Success', meta?: PaginationMeta | Record<string, unknown>) {
    const body: ApiSuccess<T> = { success: true, message, data, error: null };
    if (meta) body.meta = meta as Record<string, unknown>;
    return NextResponse.json(body, { status: 200 });
}

export function created<T>(data: T, message = 'Created successfully') {
    const body: ApiSuccess<T> = { success: true, message, data, error: null };
    return NextResponse.json(body, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
    const body: ApiError = {
        success: false, message, data: null,
        error: { code: 'VALIDATION_ERROR', details },
    };
    return NextResponse.json(body, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
    const body: ApiError = {
        success: false, message, data: null,
        error: { code: 'UNAUTHORIZED' },
    };
    return NextResponse.json(body, { status: 401 });
}

export function notFound(message = 'Not found') {
    const body: ApiError = {
        success: false, message, data: null,
        error: { code: 'NOT_FOUND' },
    };
    return NextResponse.json(body, { status: 404 });
}

export function conflict(message: string) {
    const body: ApiError = {
        success: false, message, data: null,
        error: { code: 'CONFLICT' },
    };
    return NextResponse.json(body, { status: 409 });
}

export function rateLimitExceeded(retryAfter = 60) {
    const body: ApiError = {
        success: false, message: 'Too many requests. Please slow down.',
        data: null, error: { code: 'RATE_LIMIT_EXCEEDED', details: { retryAfter } },
    };
    return NextResponse.json(body, {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
    });
}

export function internalServerError(error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    const body: ApiError = {
        success: false, message: 'Internal Server Error', data: null,
        error: { code: 'INTERNAL_SERVER_ERROR', details: errMsg },
    };
    return NextResponse.json(body, { status: 500 });
}
