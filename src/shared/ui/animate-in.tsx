'use client'

import { motion } from 'framer-motion'

import { cn } from '@/shared/lib/utils'

import type { Variant } from 'framer-motion'

type AnimationVariant = 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'fadeIn' | 'scaleUp' | 'blur'

const variants: Record<AnimationVariant, { hidden: Variant; visible: Variant }> = {
    fadeUp: {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0 },
    },
    fadeDown: {
        hidden: { opacity: 0, y: -40 },
        visible: { opacity: 1, y: 0 },
    },
    fadeLeft: {
        hidden: { opacity: 0, x: -40 },
        visible: { opacity: 1, x: 0 },
    },
    fadeRight: {
        hidden: { opacity: 0, x: 40 },
        visible: { opacity: 1, x: 0 },
    },
    fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    },
    scaleUp: {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
    },
    blur: {
        hidden: { opacity: 0, filter: 'blur(8px)' },
        visible: { opacity: 1, filter: 'blur(0px)' },
    },
}

interface AnimateInProps {
    children: React.ReactNode
    className?: string
    variant?: AnimationVariant
    delay?: number
    duration?: number
    once?: boolean
}

export function AnimateIn({
    children,
    className,
    variant = 'fadeUp',
    delay = 0,
    duration = 0.5,
    once = true,
}: AnimateInProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once, margin: '-50px' }}
            variants={variants[variant]}
            transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    )
}

interface StaggerChildrenProps {
    children: React.ReactNode
    className?: string
    staggerDelay?: number
    once?: boolean
}

export function StaggerChildren({
    children,
    className,
    staggerDelay = 0.1,
    once = true,
}: StaggerChildrenProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once, margin: '-50px' }}
            variants={{
                visible: {
                    transition: { staggerChildren: staggerDelay },
                },
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    )
}

export function StaggerItem({
    children,
    className,
    variant = 'fadeUp',
}: {
    children: React.ReactNode
    className?: string
    variant?: AnimationVariant
}) {
    return (
        <motion.div
            variants={variants[variant]}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    )
}
