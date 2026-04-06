'use client'

import { Door01FreeIcons, FootballPitchIcon, Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetFooter } from '@/shared/ui/sheet'

const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
]

export function FloatingHeader() {
    const [open, setOpen] = useState(false)

    return (
        <header
            className={cn(
                'sticky mt-5 z-50 p-2',
                'mx-auto w-full max-w-5xl rounded-lg border shadow',
                'bg-background/95 supports-backdrop-filter:bg-background/80 backdrop-blur-lg',
            )}
        >
            <nav className="mx-auto flex items-center justify-between p-1.5">
                <Link
                    href="/"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-accent duration-100"
                >
                    <HugeiconsIcon icon={FootballPitchIcon} size={20} />
                    <p className="font-mono text-base font-bold">Premier Fantasy</p>
                </Link>

                <div className="hidden items-center gap-1 lg:flex">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                            href={link.href}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/sign-in">
                        <Button size="lg" className={'w-20'}>
                            <HugeiconsIcon icon={Door01FreeIcons} size={20} />
                            Login
                        </Button>
                    </Link>

                    <Sheet open={open} onOpenChange={setOpen}>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setOpen(!open)}
                            className="lg:hidden"
                        >
                            <HugeiconsIcon icon={Menu01Icon} size={16} />
                        </Button>
                        <SheetContent side="left" showCloseButton={false}>
                            <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                                {links.map((link) => (
                                    <a
                                        key={link.label}
                                        className={buttonVariants({
                                            variant: 'ghost',
                                            className: 'justify-start',
                                        })}
                                        href={link.href}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                            <SheetFooter>
                                <Link href="/sign-in">
                                    <Button variant="outline" className="w-full">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/sign-up">
                                    <Button className="w-full">Get Started</Button>
                                </Link>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>
        </header>
    )
}
