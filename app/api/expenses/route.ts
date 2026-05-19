import { type NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import Expense from '@/models/expense.model'
import ExpenseLedger from '@/models/expense-ledger.model'
import { checkAuth } from '@/lib/checkAuth'
import { success, created, badRequest, internalServerError } from '@/lib/apiResponse'
import { createExpenseSchema } from '@/lib/validations/expense.validation'
import type { ExpenseCategory, ExpensePaymentMethod, ExpenseStatus } from '@/types/expense.type'

function generateExpenseCode(): string {
    return `EXP-${Date.now().toString(36).toUpperCase().slice(-8)}`
}

export async function GET(request: NextRequest) {
    const { error } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const { searchParams } = new URL(request.url)

        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '15')))
        const search         = searchParams.get('search')         ?? ''
        const category       = searchParams.get('category')       ?? ''
        const status         = searchParams.get('status')         ?? ''
        const payment_method = searchParams.get('payment_method') ?? ''
        const start_date     = searchParams.get('start_date')     ?? ''
        const end_date       = searchParams.get('end_date')       ?? ''
        const vendor_id      = searchParams.get('vendor_id')      ?? ''
        const is_recurring   = searchParams.get('is_recurring')

        const filter: Record<string, unknown> = { is_deleted: false }

        if (start_date && end_date) {
            filter.expense_date = {
                $gte: new Date(start_date),
                $lte: new Date(`${end_date}T23:59:59.999Z`),
            }
        } else if (start_date) {
            filter.expense_date = { $gte: new Date(start_date) }
        } else if (end_date) {
            filter.expense_date = { $lte: new Date(`${end_date}T23:59:59.999Z`) }
        }

        if (category)       filter.expense_category = category as ExpenseCategory
        if (status)         filter.expense_status   = status   as ExpenseStatus
        if (payment_method) filter.payment_method   = payment_method as ExpensePaymentMethod
        if (vendor_id)      filter.vendor_id        = vendor_id
        if (is_recurring !== null) filter.is_recurring = is_recurring === 'true'

        if (search.trim()) {
            filter.$or = [
                { title:       { $regex: search.trim(), $options: 'i' } },
                { vendor_name: { $regex: search.trim(), $options: 'i' } },
                { notes:       { $regex: search.trim(), $options: 'i' } },
            ]
        }

        const [expenses, total] = await Promise.all([
            Expense.find(filter)
                .sort({ expense_date: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Expense.countDocuments(filter),
        ])

        return success(expenses, 'Expenses fetched successfully', {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        })
    } catch (e) {
        return internalServerError(e)
    }
}

export async function POST(request: NextRequest) {
    const { error, session } = await checkAuth()
    if (error) return error

    try {
        await dbConnect()
        const body = await request.json()

        const parsed = createExpenseSchema.safeParse(body)
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors)
        }

        const expense_code = generateExpenseCode()

        const expense = await Expense.create({
            ...parsed.data,
            expense_code,
            expense_date: new Date(parsed.data.expense_date),
            created_by:   session?.user?.name ?? 'Admin',
        })

        await ExpenseLedger.create({
            expense_id:  expense._id,
            entry_type:  'EXPENSE_CREATED',
            amount:      expense.amount,
            new_status:  expense.expense_status,
            changed_by:  session?.user?.name ?? 'Admin',
            notes:       `Expense created: ${expense.title}`,
        })

        return created(expense, 'Expense created successfully')
    } catch (e) {
        return internalServerError(e)
    }
}
