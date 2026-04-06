import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

import { Badge } from '@/shared/ui/badge'
import { Card, CardContent } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'

interface LegalLayoutProps {
    title: string
    lastUpdated: string
    children: React.ReactNode
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
    return (
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-12 md:py-20">
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                Back to home
            </Link>

            <Card>
                <CardContent className="p-8 md:p-12">
                    <div className="mb-8">
                        <h1 className="font-heading text-3xl font-bold md:text-4xl">{title}</h1>
                        <Badge variant="outline" className="mt-3">
                            Last updated: {lastUpdated}
                        </Badge>
                    </div>

                    <Separator className="mb-8" />

                    <div className="legal-content space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-sm [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground [&_strong]:font-medium [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_table]:w-full [&_table]:text-left [&_table]:text-xs [&_th]:border [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:text-foreground [&_th]:bg-muted/50 [&_td]:border [&_td]:px-3 [&_td]:py-2">
                        {children}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
