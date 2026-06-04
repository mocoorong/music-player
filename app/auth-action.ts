'use server'

import bcrypt from 'bcryptjs'
import {signIn} from '../auth'
import {db} from '../lib/db'

export async function createId(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.')
  }

  const userEmail = await db.user.findUnique({
    where: {email},
  })

  if (userEmail) {
    throw new Error('이미 가입된 이메일입니다.')
  }
  const passwordHash = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  })
  await signIn('credentials', {
    email,
    password,
    redirectTo: '/',
  })
}

export async function passowrdLogin(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.')
  }

  await signIn('credentials', {
    email,
    password,
    redirectTo: '/',
  })
}
