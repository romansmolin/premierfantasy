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
        question: 'How do competitions work?',
        answer: 'Competitions run in rolling 5-gameweek cycles. A new competition starts as soon as the previous one ends. You can join the active competition before its first gameweek deadline. Top 3 finishers earn coin rewards.',
    },
    {
        question: 'How is scoring calculated?',
        answer: 'Points are calculated from real Premier League match data. Goals score 4-6 points depending on position, assists earn 3 points, clean sheets earn 4 points for defenders/goalkeepers. Yellow cards cost -1 point and red cards -3 points.',
    },
    {
        question: 'What are coins and how do I earn them?',
        answer: 'Coins are the in-app currency. You earn them by finishing in the top 3 of a competition (1st: 500, 2nd: 300, 3rd: 100 coins). You can also purchase coin packs. Coins unlock AI-powered features like transfer suggestions and match predictions.',
    },
    {
        question: 'How do transfers work?',
        answer: 'You get free transfers between gameweeks. Use the transfer modal in the Team Builder to swap players. Transfers are locked once the gameweek deadline passes. The next transfer window opens before the following gameweek.',
    },
    {
        question: 'What AI features are available?',
        answer: "Three AI features powered by GPT: Transfer Suggestions (analyzes your full squad and recommends swaps), Player Analytics (deep dive into a specific player's form and value), and Match Predictions (score predictions with fantasy player picks for upcoming fixtures).",
    },
    {
        question: 'Can I join mid-season?',
        answer: "Yes! That's the beauty of rolling competitions. Each competition only spans 5 gameweeks, so new users are never at a disadvantage. Sign up anytime and join the next available competition.",
    },
    {
        question: 'Is it free to play?',
        answer: 'Yes, the core game is completely free. Build your squad, compete in leaderboards, and earn coins through competition placement. Coin purchases are optional and unlock premium AI analysis features.',
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
        <section className="py-10 md:py-16">
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
