'use client'

import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export interface SelectOption {
    value: string
    label: string
}

interface SelectFieldProps {
    options: SelectOption[]
    /** Controlled value; leave out for an uncontrolled field that starts at `defaultValue`. */
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    /** Submitted with a surrounding HTML form, like a native select would be. */
    name?: string
    'aria-label': string
    className?: string
}

/** The select component never holds an empty string, so "no value" travels as this marker inside. */
const EMPTY = '__empty__'
const inner = (value: string) => (value === '' ? EMPTY : value)

/** A shadcn select with the API of a native one: string values, an empty value allowed, form submission by name. */
export function SelectField({
    options,
    value,
    defaultValue = '',
    onValueChange,
    name,
    className,
    ...rest
}: SelectFieldProps) {
    const [own, setOwn] = useState(defaultValue)
    const current = value ?? own
    const items = options.map((o) => ({ value: inner(o.value), label: o.label }))

    return (
        <>
            {name && <input type="hidden" name={name} value={current} />}
            <Select
                items={items}
                value={inner(current)}
                onValueChange={(next) => {
                    if (next === null) return

                    const plain = next === EMPTY ? '' : next

                    setOwn(plain)
                    onValueChange?.(plain)
                }}
            >
                <SelectTrigger
                    aria-label={rest['aria-label']}
                    className={cn('w-full data-[size=default]:h-10 text-sm', className)}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    )
}
