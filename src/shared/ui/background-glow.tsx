import { cn } from '@/shared/lib/utils'

interface BackgroundGlowProps {
    className?: string
    children: React.ReactNode
    variant?: 'glow' | 'dots' | 'both'
}

export function BackgroundGlow({ className, children, variant = 'both' }: BackgroundGlowProps) {
    return (
        <div className={cn('relative w-full', className)}>
            {(variant === 'glow' || variant === 'both') && (
                <>
                    {/* Light mode glow */}
                    <div
                        className="absolute inset-0 z-0 dark:hidden"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, #FFF991 0%, transparent 70%)',
                            opacity: 0.6,
                            mixBlendMode: 'multiply',
                        }}
                    />
                    {/* Dark mode glow */}
                    <div
                        className="absolute inset-0 z-0 hidden dark:block"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at center, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                        }}
                    />
                </>
            )}

            {(variant === 'dots' || variant === 'both') && (
                <>
                    {/* Light mode dots */}
                    <div
                        className="absolute inset-0 z-0 dark:hidden"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.15) 1px, transparent 0)',
                            backgroundSize: '20px 20px',
                        }}
                    />
                    {/* Dark mode dots */}
                    <div
                        className="absolute inset-0 z-0 hidden dark:block"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.07) 1px, transparent 0)',
                            backgroundSize: '20px 20px',
                        }}
                    />
                </>
            )}

            <div className="relative z-10">{children}</div>
        </div>
    )
}
