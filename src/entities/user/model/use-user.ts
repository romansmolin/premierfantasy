import useSWR from 'swr'

import { userService } from '../api/user.service'

export const useUser = (id: string | undefined) => {
    const { data, error, isLoading } = useSWR(id ? `/api/users/${id}` : null, () => userService.getById(id))

    return { user: data, error, isLoading }
}
