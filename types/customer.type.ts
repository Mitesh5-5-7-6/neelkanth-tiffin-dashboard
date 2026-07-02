import type { Document } from 'mongoose';

export interface ITiffinDefaults {
    morning: boolean;
    morning_qty: number;
    morning_price: number;
    evening: boolean;
    evening_qty: number;
    evening_price: number;
}

export interface ICustomer extends Document {
    full_name: string;
    phone?: string;
    address?: string;
    notes?: string;
    is_active: boolean;
    tiffin_defaults: ITiffinDefaults;
    createdAt: Date;
    updatedAt: Date;
}

export interface Customer {
    _id: string;
    full_name: string;
    phone?: string;
    address?: string;
    notes?: string;
    is_active: boolean;
    tiffin_defaults: ITiffinDefaults;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
}

export interface CustomerStats {
    total: number;
    active: number;
    inactive: number;
    outstanding: number;
}
