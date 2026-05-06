import type { Document } from 'mongoose';

export interface ICustomer extends Document {
    full_name: string;
    phone: string;
    address?: string;
    default_morning: boolean;
    default_evening: boolean;
    price_morning: number;
    price_evening: number;
    is_active: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Customer {
    _id: string;
    full_name: string;
    phone: string;
    address?: string;
    default_morning: boolean;
    default_evening: boolean;
    price_morning: number;
    price_evening: number;
    is_active: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerFormData {
    full_name: string;
    phone: string;
    address?: string;
    default_morning: boolean;
    default_evening: boolean;
    price_morning: number;
    price_evening: number;
    notes?: string;
}

export interface CustomerQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean | string;
    sort?: string;
}

export interface CustomerStats {
    total: number;
    active: number;
    inactive: number;
    outstanding: number;
}
