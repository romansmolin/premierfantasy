'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
    AccountSetting01Icon,
    AlertCircleIcon,
    DeleteThrowIcon,
    LockPasswordIcon,
    SaveIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod/v4'

import { userService } from '@/entities/user/api/user.service'

import { signOut, useSession } from '@/shared/lib/auth-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Skeleton } from '@/shared/ui/skeleton'

const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Invalid email'),
})

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export const ProfileView = () => {
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const user = session?.user

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: {
            name: user?.name ?? '',
            email: user?.email ?? '',
        },
    })

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const handleProfileSubmit = async (data: ProfileFormValues) => {
        if (!user?.id) return

        try {
            await userService.update(user.id, { name: data.name, email: data.email })
            toast.success('Profile updated successfully')
        } catch {
            toast.error('Failed to update profile. Please try again.')
        }
    }

    const handlePasswordSubmit = async (data: PasswordFormValues) => {
        if (!user?.id) return

        try {
            await userService.changePassword(user.id, data.currentPassword, data.newPassword)
            toast.success('Password changed successfully')
            passwordForm.reset()
        } catch {
            toast.error('Failed to change password. Please check your current password.')
        }
    }

    const handleDeleteAccount = async () => {
        if (!user?.id || deleteConfirmText !== 'DELETE') return

        setIsDeleting(true)

        try {
            await userService.delete(user.id)
            await signOut()
            router.push('/sign-in')
        } catch {
            toast.error('Failed to delete account. Please try again.')
            setIsDeleting(false)
        }
    }

    if (isPending) {
        return (
            <div className="mx-auto max-w-2xl space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-32" />
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="mx-auto space-y-6">
            <div className="flex items-center gap-2">
                <HugeiconsIcon icon={AccountSetting01Icon} size={20} />
                <h2 className="text-lg font-semibold">Profile</h2>
            </div>

            {/* Section 1: Avatar + Basic Info */}
            <Card>
                <CardContent className="flex items-center gap-4">
                    <Avatar className="size-20">
                        {user.image && <AvatarImage src={user.image} alt={user.name} />}
                        <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>

                        <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary">
                                Member since{' '}
                                {new Date(user.createdAt).toLocaleDateString('en-GB', {
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Edit Profile */}
            <Card>
                <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" {...profileForm.register('name')} />
                            {profileForm.formState.errors.name && (
                                <p className="text-xs text-destructive">
                                    {profileForm.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...profileForm.register('email')} />
                            {profileForm.formState.errors.email && (
                                <p className="text-xs text-destructive">
                                    {profileForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                            <HugeiconsIcon icon={SaveIcon} />
                            {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Section 3: Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={LockPasswordIcon} size={16} />
                        Change Password
                    </CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                {...passwordForm.register('currentPassword')}
                            />
                            {passwordForm.formState.errors.currentPassword && (
                                <p className="text-xs text-destructive">
                                    {passwordForm.formState.errors.currentPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                {...passwordForm.register('newPassword')}
                            />
                            {passwordForm.formState.errors.newPassword && (
                                <p className="text-xs text-destructive">
                                    {passwordForm.formState.errors.newPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                {...passwordForm.register('confirmPassword')}
                            />
                            {passwordForm.formState.errors.confirmPassword && (
                                <p className="text-xs text-destructive">
                                    {passwordForm.formState.errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                            <HugeiconsIcon icon={LockPasswordIcon} />
                            {passwordForm.formState.isSubmitting ? 'Changing...' : 'Change Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Section 4: Danger Zone */}
            <Card className="ring-destructive/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Separator className="mb-4" />

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Delete Account</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently delete your account and all associated data. This action cannot be
                                undone.
                            </p>
                        </div>

                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                                <HugeiconsIcon icon={DeleteThrowIcon} />
                                Delete
                            </DialogTrigger>

                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Are you sure?</DialogTitle>
                                    <DialogDescription>
                                        This action cannot be undone. Your account, teams, and all associated
                                        data will be permanently deleted. Type <strong>DELETE</strong> to
                                        confirm.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-1.5">
                                    <Label htmlFor="delete-confirm">Confirmation</Label>
                                    <Input
                                        id="delete-confirm"
                                        placeholder="Type DELETE to confirm"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    />
                                </div>

                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setDeleteDialogOpen(false)
                                            setDeleteConfirmText('')
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                        onClick={handleDeleteAccount}
                                    >
                                        <HugeiconsIcon icon={DeleteThrowIcon} />
                                        {isDeleting ? 'Deleting...' : 'Delete Account'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
