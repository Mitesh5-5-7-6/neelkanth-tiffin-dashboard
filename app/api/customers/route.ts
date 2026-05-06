import { type NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/models/customer.model';
import { checkAuth } from '@/lib/checkAuth';
import { success, created, badRequest, conflict, internalServerError } from '@/lib/apiResponse';
import { createCustomerSchema } from '@/lib/validations/customer.validation';

export async function GET(request: NextRequest) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);

        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10')));
        const search = searchParams.get('search') ?? '';
        const isActiveParam = searchParams.get('is_active');

        const filter: Record<string, unknown> = {};

        if (search.trim()) {
            filter.$or = [
                { full_name: { $regex: search.trim(), $options: 'i' } },
                { phone: { $regex: search.trim(), $options: 'i' } },
            ];
        }

        if (isActiveParam !== null && isActiveParam !== '') {
            filter.is_active = isActiveParam === 'true';
        }

        const [customers, total] = await Promise.all([
            Customer.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Customer.countDocuments(filter),
        ]);

        return success(customers, 'Customers fetched successfully', {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (e) {
        return internalServerError(e);
    }
}

export async function POST(request: NextRequest) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();
        const body = await request.json();

        const parsed = createCustomerSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors);
        }

        const existing = await Customer.findOne({ phone: parsed.data.phone });
        if (existing) {
            return conflict(`A customer with phone ${parsed.data.phone} already exists`);
        }

        const customer = await Customer.create(parsed.data);
        return created(customer, 'Customer created successfully');
    } catch (e) {
        return internalServerError(e);
    }
}
