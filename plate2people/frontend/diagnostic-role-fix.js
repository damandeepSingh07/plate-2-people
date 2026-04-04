#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Check & Fix 403 Food Donation Error
 * 
 * This script helps diagnose and fix the "403 Permission Denied" error
 * when trying to create food donations.
 * 
 * Usage:
 *   1. Make sure you're logged in to the app
 *   2. Open browser DevTools (F12)
 *   3. Go to Console tab
 *   4. Copy & paste this entire script
 *   5. Press Enter to run
 */

console.log('🔍 STARTING DIAGNOSTIC CHECK...\n')

// Step 1: Check if user is logged in
const token = localStorage.getItem('access_token')
if (!token) {
  console.error('❌ NOT LOGGED IN')
  console.log('Please log in first, then run this script again.')
  process.exit(1)
}
console.log('✅ User is logged in\n')

// Step 2: Fetch current user data
async function runDiagnostics() {
  try {
    console.log('📋 FETCHING USER PROFILE...')
    const response = await fetch('http://localhost:8000/api/user/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`)
    }

    const user = await response.json()
    console.log('✅ User profile fetched\n')

    // Step 3: Display user info
    console.log('👤 USER INFORMATION:')
    console.log(`   Name: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role || '❌ MISSING'}\n`)

    // Step 4: Check if role is correct
    if (!user.role) {
      console.error('❌ ROLE IS MISSING')
      console.log('This is likely causing the 403 error.\n')
      console.log('🔧 FIXING: Attempting to set role to "donor"...')

      const updateResponse = await fetch('http://localhost:8000/api/user/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'donor' }),
      })

      if (updateResponse.ok) {
        console.log('✅ ROLE UPDATED SUCCESSFULLY!')
        console.log('You can now try creating a donation.')
      } else {
        console.error('❌ Failed to update role:', updateResponse.status)
        console.log('\n📝 MANUAL FIX:')
        console.log('1. Log out completely')
        console.log('2. Clear browser cache')
        console.log('3. Sign up again as a Donor')
      }
    } else if (user.role !== 'donor') {
      console.warn(`⚠️  ROLE IS NOT DONOR: "${user.role}"`)
      console.log('Only donors can create food donations.\n')

      if (confirm('Would you like to change your role to Donor?')) {
        console.log('🔧 Attempting to change role...')

        const updateResponse = await fetch('http://localhost:8000/api/user/', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'donor' }),
        })

        if (updateResponse.ok) {
          console.log('✅ ROLE UPDATED TO DONOR!')
          console.log('Refreshing page...')
          setTimeout(() => window.location.reload(), 1000)
        } else {
          console.error('❌ Failed to update role')
        }
      }
    } else {
      console.log('✅ Role is correctly set to DONOR')
      console.log('\n🤔 If you still get the 403 error:')
      console.log('1. Try refreshing the page')
      console.log('2. Clear browser cache')
      console.log('3. Log out and log back in')
      console.log('4. Contact admin if issue persists')
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(50))
    console.log('DIAGNOSTIC SUMMARY:')
    console.log('='.repeat(50))
    console.log('If no changes were made above, your account is ready!')
    console.log('Try posting a donation now.')

  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error.message)
    console.log('\n🔗 Please check:')
    console.log('1. Backend is running on http://localhost:8000')
    console.log('2. You are logged in')
    console.log('3. Your network connection is working')
  }
}

runDiagnostics()
