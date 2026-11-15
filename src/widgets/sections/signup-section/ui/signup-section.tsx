'use client'

import Link from 'next/link'

import { SignUpForm } from '@/features/auth/sign-up/ui/sign-up-form'

import { AnimateIn } from '@/shared/ui/animate-in'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'

export function SignupSection() {
    return (
        <section id="how-it-works" className="py-10 md:py-16">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    {/* Left: copy */}
                    <AnimateIn variant="fadeLeft">
                        <div className="space-y-6">
                            <Badge variant="outline">Free to Join</Badge>
                            <h2 className="font-heading text-3xl font-semibold md:text-4xl lg:text-5xl">
                                How it works
                            </h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Create a free account, explore the numbers and use AI when you want a deeper
                                look. Premier Fantasy is not a game: nothing you do here earns points or
                                prizes.
                            </p>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        1
                                    </span>
                                    <span>Explore fixtures, clubs and player stats</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        2
                                    </span>
                                    <span>Open a player or match for an AI analysis, paid with Credits</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        3
                                    </span>
                                    <span>Decide who to pick</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        4
                                    </span>
                                    <span>Enter your squad on your fantasy platform yourself</span>
                                </li>
                            </ul>
                            <p className="text-xs text-muted-foreground">
                                Already have an account?{' '}
                                <Link href="/sign-in" className="text-primary underline underline-offset-4">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </AnimateIn>

                    {/* Right: form */}
                    <AnimateIn variant="fadeRight" delay={0.2}>
                        <Card>
                            <CardContent className="p-6 md:p-8">
                                <SignUpForm />
                            </CardContent>
                        </Card>
                    </AnimateIn>
                </div>
            </div>
        </section>
    )
}
