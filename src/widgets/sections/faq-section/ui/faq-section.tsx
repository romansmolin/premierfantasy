'use client'

import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { AnimateIn } from '@/shared/ui/animate-in'
import { Badge } from '@/shared/ui/badge'

interface FaqItem {
    question: string
    answer: string
}

const faqs: FaqItem[] = [
    {
        question: 'Is Premier Fantasy a fantasy game?',
        answer: 'No. Premier Fantasy is an analytics tool. We do not run fantasy games, contests, leagues or prizes, and nothing you do here earns points or rewards. You enter your squad on the fantasy platform you already play.',
    },
    {
        question: 'What can I do for free?',
        answer: 'Create an account, see the upcoming fixtures, browse clubs and players, and open player profiles with season statistics.',
    },
    {
        question: 'What are Credits?',
        answer: 'Credits are a prepaid unit used to pay for AI features. You buy a pack, and Credits never expire. They have no cash value and cannot be transferred to another account.',
    },
    {
        question: 'Which AI features are available and what do they cost?',
        answer: 'AI player analysis costs 10 Credits and AI match prediction costs 10 Credits. Squad review (30 Credits) and auto-build (300 Credits) are coming soon. Re-opening a match prediction you already paid for is always free, and a player analysis stays free to re-open for 7 days.',
    },
    {
        question: 'Can I get a refund?',
        answer: 'Unused Credits you purchased can be refunded on request within 14 days of purchase. Credits that were already spent on AI features cannot be refunded. Write to support@premierfantasy.net.',
    },
    {
        question: 'Does the AI guarantee better results?',
        answer: 'No. AI output is informational, based on public statistics, and does not guarantee any result on any fantasy platform.',
    },
    {
        question: 'Is Premier Fantasy affiliated with the Premier League or Fantasy Premier League?',
        answer: 'No. Premier Fantasy is an independent tool and is not affiliated with, endorsed by, or connected to the Premier League, Fantasy Premier League, UEFA or any fantasy game operator.',
    },
]

function FaqAccordionItem({
    item,
    isOpen,
    onToggle,
}: {
    item: FaqItem
    isOpen: boolean
    onToggle: () => void
}) {
    return (
        <div className="border-b last:border-b-0">
            <button
                onClick={onToggle}
                className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-primary"
            >
                <span className="text-sm font-medium pr-4">{item.question}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="shrink-0"
                >
                    <HugeiconsIcon icon={Add01Icon} size={18} className={cn(isOpen && 'text-primary')} />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <section id="faq" className="py-10 md:py-16">
            <div className="mx-auto max-w-3xl px-6">
                <AnimateIn variant="fadeUp">
                    <div className="flex flex-col items-center gap-4 text-center mb-10">
                        <Badge variant="outline">FAQ</Badge>
                        <h2 className="font-heading text-3xl font-semibold md:text-4xl">
                            Frequently asked questions
                        </h2>
                        <p className="text-muted-foreground max-w-lg">
                            Everything you need to know about Premier Fantasy. Can&apos;t find what
                            you&apos;re looking for? Reach out to our team.
                        </p>
                    </div>
                </AnimateIn>

                <AnimateIn variant="fadeUp" delay={0.2}>
                    <div className="rounded-2xl border bg-card p-6 md:p-8">
                        {faqs.map((faq, index) => (
                            <FaqAccordionItem
                                key={index}
                                item={faq}
                                isOpen={openIndex === index}
                                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>
                </AnimateIn>
            </div>
        </section>
    )
}
