'use client'

import Link from 'next/link'

import { SignUpForm } from '@/features/auth/sign-up/ui/sign-up-form'

import { AnimateIn } from '@/shared/ui/animate-in'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'

export function SignupSection() {
    return (
        <section className="py-10 md:py-16">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    {/* Left: copy */}
                    <AnimateIn variant="fadeLeft">
                        <div className="space-y-6">
                            <Badge variant="outline">Free to Play</Badge>
                            <h2 className="font-heading text-3xl font-semibold md:text-4xl lg:text-5xl">
                                Ready to build your dream team?
                            </h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Create your account in seconds and start competing. Pick 11 Premier League
                                players, join the active competition, and climb the leaderboard.
                            </p>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        1
                                    </span>
                                    <span>Sign up with email and password</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        2
                                    </span>
                                    <span>Build your 11-player squad (100M budget)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                        3
                                    </span>
                                    <span>Compete, earn coins, unlock AI insights</span>
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
