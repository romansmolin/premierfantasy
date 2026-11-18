'use client'

import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

import { formatIsoDate, parseIsoDate } from '@/shared/lib/iso-date'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

interface DatePickerProps {
    /** `YYYY-MM-DD`, or empty for no date. */
    value: string | undefined
    onChange: (value: string) => void
    id?: string
    placeholder?: string
    /** Earliest selectable date; the year dropdown starts here. */
    fromDate?: Date
    /** Latest selectable date; the year dropdown ends here. */
    toDate?: Date
    invalid?: boolean
    'aria-describedby'?: string
}

export function DatePicker({
    value,
    onChange,
    id,
    placeholder = 'Pick a date',
    fromDate,
    toDate,
    invalid,
    ...rest
}: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const selected = parseIsoDate(value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-invalid={invalid}
                        aria-describedby={rest['aria-describedby']}
                        className={cn(
                            'h-10 w-full justify-between px-3 font-normal',
                            !selected && 'text-muted-foreground',
                        )}
                    />
                }
            >
                {selected
                    ? selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                    : placeholder}
                <HugeiconsIcon icon={Calendar03Icon} size={16} />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selected}
                    defaultMonth={selected ?? toDate}
                    startMonth={fromDate}
                    endMonth={toDate}
                    disabled={[...(fromDate ? [{ before: fromDate }] : []), ...(toDate ? [{ after: toDate }] : [])]}
                    onSelect={(date) => {
                        onChange(date ? formatIsoDate(date) : '')
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
