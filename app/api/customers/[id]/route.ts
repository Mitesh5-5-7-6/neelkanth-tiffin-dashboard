import { type NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/models/customer.model';
import { checkAuth } from '@/lib/checkAuth';
import { success, badRequest, notFound, conflict, internalServerError } from '@/lib/apiResponse';
import { updateCustomerSchema } from '@/lib/validations/customer.validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();
        const { id } = await params;
        const customer = await Customer.findById(id).lean();
        if (!customer) return notFound('Customer not found');
        return success(customer, 'Customer fetched successfully');
    } catch (e) {
        return internalServerError(e);
    }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const parsed = updateCustomerSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors);
        }

        if (parsed.data.phone) {
            const duplicate = await Customer.findOne({ phone: parsed.data.phone, _id: { $ne: id } });
            if (duplicate) return conflict(`Phone ${parsed.data.phone} is already in use`);
        }

        const customer = await Customer.findByIdAndUpdate(
            id,
            { $set: parsed.data },
            { new: true, runValidators: true }
        ).lean();

        if (!customer) return notFound('Customer not found');
        return success(customer, 'Customer updated successfully');
    } catch (e) {
        return internalServerError(e);
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();
        const { id } = await params;
        const customer = await Customer.findByIdAndUpdate(
            id,
            { $set: { is_active: false } },
            { new: true }
        ).lean();

        if (!customer) return notFound('Customer not found');
        return success(customer, 'Customer deactivated successfully');
    } catch (e) {
        return internalServerError(e);
    }
}
