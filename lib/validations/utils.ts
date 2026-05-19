import type { ZodTypeAny } from 'zod'

/**
 * Bridges a Zod schema (or sub-schema) into a TanStack Form field validator.
 * Use it on any field where the validation rule lives in a Zod schema so the
 * same schema drives both form UI errors and API route validation.
 *
 * Usage:
 *   validators={{ onChange: zodField(customerSchema.shape.full_name) }}
 */
export function zodField(schema: ZodTypeAny) {
    return ({ value }: { value: unknown }) => {
        const result = schema.safeParse(value)
        if (result.success) return undefined
        return result.error.issues[0]?.message
    }
}
