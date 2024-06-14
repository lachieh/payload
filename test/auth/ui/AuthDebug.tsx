import type { UIField } from 'payload'
import type { User } from 'payload'

import { useAuth } from '@payloadcms/ui/providers/Auth'
import React, { useEffect, useState } from 'react'

export const AuthDebug: React.FC<UIField> = () => {
  const [state, setState] = useState<User | null | undefined>()
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      void fetch(`/api/users/${user.id}`)
        .then((r) => r.json())
        .then((newUser) => {
          setState(newUser)
        })
    }
  }, [user])

  return (
    <div id="auth-debug-ui-field">
      <div id="users-api-result">{state?.custom as string}</div>
      <div id="use-auth-result">{user?.custom as string}</div>
    </div>
  )
}
