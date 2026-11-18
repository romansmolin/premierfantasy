'use client'

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Controller } from 'react-hook-form'


import { getCountryOptions } from '@/shared/lib/countries'
import type { CheckoutCustomer } from '@/shared/model/checkout-customer'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { DatePicker } from '@/shared/ui/date-picker'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

import type { Control, FieldPath, UseFormRegister } from 'react-hook-form'

const TEXT_FIELDS = [
    { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
    { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { name: 'phone', label: 'Phone number', type: 'tel', autoComplete: 'tel' },
    { name: 'address', label: 'Billing address', autoComplete: 'street-address' },
    { name: 'city', label: 'City', autoComplete: 'address-level2' },
] as const satisfies readonly { name: FieldPath<CheckoutCustomer>; label: string; type?: string; autoComplete: string }[]

const COUNTRIES = getCountryOptions()
const TODAY = new Date()
const OLDEST_BIRTH_DATE = new Date(TODAY.getFullYear() - 120, 0, 1)

type Errors = Partial<Record<FieldPath<CheckoutCustomer>, { message?: string }>>

interface Props {
    control: Control<CheckoutCustomer>
    register: UseFormRegister<CheckoutCustomer>
    errors: Errors
    onSave: () => void
    isSaving: boolean
    /** The form matches what is stored on the account. */
    isSaved: boolean
    saveError: string | null
}

const FieldRow = ({
    id,
    label,
    error,
    children,
}: {
    id: string
    label: string
    error?: { message?: string }
    children: React.ReactNode
}) => (
    <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {children}
        {error && <FieldError id={`${id}-error`} errors={[error]} />}
    </Field>
)

export const BillingDetailsCard = ({ control, register, errors, onSave, isSaving, isSaved, saveError }: Props) => {
    const describedBy = (id: string, name: FieldPath<CheckoutCustomer>) =>
        errors[name] ? `${id}-error` : undefined

    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing details</CardTitle>
                <CardDescription>
                    Enter the details of the person making the payment. They are saved to your account and
                    filled in for your next payment.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
                {TEXT_FIELDS.map((field) => {
                    const id = `billing-${field.name}`

                    return (
                        <FieldRow key={field.name} id={id} label={field.label} error={errors[field.name]}>
                            <Input
                                id={id}
                                type={'type' in field ? field.type : 'text'}
                                autoComplete={field.autoComplete}
                                aria-invalid={Boolean(errors[field.name])}
                                aria-describedby={describedBy(id, field.name)}
                                {...register(field.name)}
                            />
                        </FieldRow>
                    )
                })}

                <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                        <FieldRow id="billing-country" label="Country" error={errors.country}>
                            <Select
                                items={COUNTRIES}
                                value={field.value || null}
                                onValueChange={(value) => field.onChange(value ?? '')}
                            >
                                <SelectTrigger
                                    id="billing-country"
                                    ref={field.ref}
                                    onBlur={field.onBlur}
                                    aria-invalid={Boolean(errors.country)}
                                    aria-describedby={describedBy('billing-country', 'country')}
                                    className="w-full data-[size=default]:h-10 text-sm"
                                >
                                    <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((country) => (
                                        <SelectItem key={country.value} value={country.value}>
                                            {country.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FieldRow>
                    )}
                />

                <FieldRow id="billing-zip" label="Postal code" error={errors.zip}>
                    <Input
                        id="billing-zip"
                        autoComplete="postal-code"
                        aria-invalid={Boolean(errors.zip)}
                        aria-describedby={describedBy('billing-zip', 'zip')}
                        {...register('zip')}
                    />
                </FieldRow>

                <Controller
                    control={control}
                    name="birthDate"
                    render={({ field }) => (
                        <FieldRow id="billing-birthDate" label="Date of birth (optional)" error={errors.birthDate}>
                            <DatePicker
                                id="billing-birthDate"
                                value={field.value}
                                onChange={field.onChange}
                                fromDate={OLDEST_BIRTH_DATE}
                                toDate={TODAY}
                                invalid={Boolean(errors.birthDate)}
                                aria-describedby={describedBy('billing-birthDate', 'birthDate')}
                            />
                        </FieldRow>
                    )}
                />
            </CardContent>
            <CardFooter className="flex-wrap items-center gap-3">
                <Button type="button" onClick={onSave} disabled={isSaving || isSaved}>
                    {isSaving ? (
                        'Saving…'
                    ) : isSaved ? (
                        <>
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                            Saved
                        </>
                    ) : (
                        'Save details'
                    )}
                </Button>
                {saveError ? (
                    <p role="alert" className="text-sm text-destructive">
                        {saveError}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {isSaved
                            ? 'Saved to your account — these details will be filled in next time.'
                            : 'Save once and skip typing them again on your next payment.'}
                    </p>
                )}
            </CardFooter>
        </Card>
    )
}
