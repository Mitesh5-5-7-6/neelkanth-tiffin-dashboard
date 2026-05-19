import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Vendor from '@/models/vendor.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { updateVendorSchema } from '@/lib/validations/vendor.validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params
        const vendor  = await Vendor.findById(id).lean()
        if (!vendor) return notFound('Vendor not found')
        return success(vendor, 'Vendor fetched successfully')
    } catch (e) {
        return internalServerError(e)
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params
        const body   = await request.json()
        const parsed = updateVendorSchema.safeParse(body)

        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const vendor = await Vendor.findByIdAndUpdate(id, parsed.data, { new: true, lean: true })
        if (!vendor) return notFound('Vendor not found')
        return success(vendor, 'Vendor updated successfully')
    } catch (e) {
        return internalServerError(e)
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params
        const vendor  = await Vendor.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true, lean: true }
        )
        if (!vendor) return notFound('Vendor not found')
        return success(null, 'Vendor deactivated successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
