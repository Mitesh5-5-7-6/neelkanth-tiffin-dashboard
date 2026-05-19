import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Vendor from '@/models/vendor.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, created, badRequest, internalServerError } from '@/lib/apiResponse'
import { createVendorSchema } from '@/lib/validations/vendor.validation'
import type { VendorType } from '@/types/vendor.type'

function generateVendorCode(): string {
    return `VND-${Date.now().toString(36).toUpperCase().slice(-8)}`
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { searchParams } = new URL(request.url)

        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
        const search      = searchParams.get('search')      ?? ''
        const vendor_type = searchParams.get('vendor_type') ?? ''
        const is_active   = searchParams.get('is_active')

        const filter: Record<string, unknown> = {}

        if (vendor_type) filter.vendor_type = vendor_type as VendorType
        if (is_active !== null) filter.is_active = is_active === 'true'

        if (search.trim()) {
            filter.$or = [
                { name:  { $regex: search.trim(), $options: 'i' } },
                { phone: { $regex: search.trim(), $options: 'i' } },
            ]
        }

        const [vendors, total] = await Promise.all([
            Vendor.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
            Vendor.countDocuments(filter),
        ])

        return success(vendors, 'Vendors fetched successfully', {
            page, limit, total, totalPages: Math.ceil(total / limit),
        })
    } catch (e) {
        return internalServerError(e)
    }
}

export async function POST(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body   = await request.json()
        const parsed = createVendorSchema.safeParse(body)

        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const vendor = await Vendor.create({
            ...parsed.data,
            vendor_code: generateVendorCode(),
        })

        return created(vendor, 'Vendor created successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
