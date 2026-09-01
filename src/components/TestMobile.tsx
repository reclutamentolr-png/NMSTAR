'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestMobile() {
  const [test, setTest] = useState('INIT')
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    console.log('🔵 TestMobile: useEffect eseguito')
    setTest('LOADING')
    
    const supabase = createClient()
    supabase.rpc('get_public_latest_users', { p_limit: 5 })
      .then(({ data, error }) => {
        console.log(' TestMobile: dati ricevuti', data?.length)
        if (data) {
          setUsers(data)
          setTest('OK')
        } else {
          setTest('ERROR: ' + error?.message)
        }
      })
      .catch(err => {
        setTest('EXCEPTION: ' + err.message)
      })
  }, [])

  // Questo div è VISIBILISSIMO: rosso, grande, con testo enorme
  return (
    <div style={{
      background: 'red',
      color: 'white',
      padding: '20px',
      margin: '20px',
      borderRadius: '10px',
      fontSize: '18px',
      fontWeight: 'bold',
      border: '3px solid yellow'
    }}>
      <p>🔴 TEST MOBILE - Stato: {test}</p>
      <p>Utenti caricati: {users.length}</p>
      {users.map(u => (
        <p key={u.id}>- {u.first_name} {u.last_name}</p>
      ))}
    </div>
  )
}