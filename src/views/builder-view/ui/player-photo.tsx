'use client'

import { UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface PlayerPhotoProps {
    src: string
    name: string
    className?: string
}

/** The head shot; a silhouette stands in when the image is missing, so a card never shows a broken picture. */
export function PlayerPhoto({ src, name, className }: PlayerPhotoProps) {
    const [failed, setFailed] = useState(false)

    return (
        <div
            className={cn(
                'relative shrink-0 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-700/30',
                className,
            )}
        >
            {failed || !src ? (
                <span className="grid size-full place-items-center text-amber-800/50">
                    <HugeiconsIcon icon={UserIcon} size={22} />
                </span>
            ) : (
                <Image
                    src={src}
                    alt={name}
                    width={96}
                    height={96}
                    className="size-full object-cover object-top"
                    onError={() => setFailed(true)}
                />
            )}
        </div>
    )
}
