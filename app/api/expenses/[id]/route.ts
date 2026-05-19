import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Expense from '@/models/expense.model'
import ExpenseLedger from '@/models/expense-ledger.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, badRequest, notFound, internalServerError } from '@/lib/apiResponse'
import { updateExpenseSchema } from '@/lib/validations/expense.validation'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params
        const expense = await Expense.findOne({ _id: id, is_deleted: false }).lean()
        if (!expense) return notFound('Expense not found')
        return success(expense, 'Expense fetched successfully')
    } catch (e) {
        return internalServerError(e)
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const { error, session } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params
        const body = await request.json()

        const parsed = updateExpenseSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const existing = await Expense.findOne({ _id: id, is_deleted: false })
        if (!existing) return notFound('Expense not found')

        const previousStatus = existing.expense_status
        const updates = {
            ...parsed.data,
            ...(parsed.data.expense_date
                ? { expense_date: new Date(parsed.data.expense_date) }
                : {}),
        }

        Object.assign(existing, updates)
        await existing.save()

        const entryType = parsed.data.expense_status === 'PAID'       ? 'EXPENSE_PAID'
                        : parsed.data.expense_status === 'CANCELLED'  ? 'EXPENSE_CANCELLED'
                        : 'EXPENSE_UPDATED'

        await ExpenseLedger.create({
            expense_id:      existing._id,
            entry_type:      entryType,
            amount:          existing.amount,
            previous_status: previousStatus,
            new_status:      existing.expense_status,
            changed_by:      session?.user?.name ?? 'Admin',
            notes:           `Expense updated: ${existing.title}`,
        })

        return success(existing.toObject(), 'Expense updated successfully')
    } catch (e) {
        return internalServerError(e)
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    const { error, session } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { id } = await params

        const expense = await Expense.findOne({ _id: id, is_deleted: false })
        if (!expense) return notFound('Expense not found')

        expense.is_deleted = true
        expense.deleted_at = new Date()
        expense.deleted_by = session?.user?.name ?? 'Admin'
        await expense.save()

        await ExpenseLedger.create({
            expense_id:      expense._id,
            entry_type:      'EXPENSE_CANCELLED',
            amount:          expense.amount,
            previous_status: expense.expense_status,
            new_status:      'CANCELLED',
            changed_by:      session?.user?.name ?? 'Admin',
            notes:           `Expense soft-deleted: ${expense.title}`,
        })

        return success(null, 'Expense deleted successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
