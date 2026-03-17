'use client'

import { PlusSignCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/ui/dialog'

export function FantasyTeamDialogOnboardingButton() {
    return (
        <Dialog>
            <DialogTrigger
                render={
                    <Button size={'lg'} className="flex gap-2 items-center">
                        <HugeiconsIcon icon={PlusSignCircleIcon} />
                        Create Fantasy Team
                    </Button>
                }
            />

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Welcome to Fantasy Football!</DialogTitle>

                    <DialogDescription>
                        You don&apos;t have a fantasy team yet. Create your first team to start competing.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button className="w-full">Create your first team</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
