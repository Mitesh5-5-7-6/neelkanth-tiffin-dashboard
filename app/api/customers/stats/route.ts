import { type NextRequest } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Customer from '@/models/customer.model';
import { checkAuth } from '@/lib/checkAuth';
import { success, internalServerError } from '@/lib/apiResponse';

export async function GET(_request: NextRequest) {
    const { error } = await checkAuth();
    if (error) return error;

    try {
        await dbConnect();

        const [total, active, inactive] = await Promise.all([
            Customer.countDocuments(),
            Customer.countDocuments({ is_active: true }),
            Customer.countDocuments({ is_active: false }),
        ]);

        // outstanding would come from a payments aggregation in a full implementation
        return success(
            { total, active, inactive, outstanding: 0 },
            'Customer stats fetched'
        );
    } catch (e) {
        return internalServerError(e);
    }
}
