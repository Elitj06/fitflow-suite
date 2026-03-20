'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/utils'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/trainer')
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    redirect('/onboarding')
  }

  return { success: true, message: 'Verifique seu email para confirmar o cadastro.' }
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Nao autenticado' }
  }

  const orgName = formData.get('orgName') as string
  const orgPhone = formData.get('orgPhone') as string
  const role = formData.get('role') as string
  const specialty = formData.get('specialty') as string

  try {
    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: generateSlug(orgName) + '-' + Date.now().toString(36),
        phone: orgPhone,
        email: user.email,
        plan: 'STARTER',
        coinsEnabled: true,
        chatbotConfig: {
          welcomeMessage: `Ola! Bem-vindo ao ${orgName}. Como posso ajudar?`,
          businessHours: 'Segunda a Sexta, 6h as 22h. Sabado 8h as 18h.',
          aiPersonality: 'amigavel e profissional',
          knowledgeBase: [],
          plans: [],
        },
      },
    })

    // Create profile
    await prisma.profile.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: role === 'trainer' ? 'TRAINER' : 'ADMIN',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        email: user.email!,
        phone: orgPhone,
        specialties: specialty ? [specialty] : [],
        coinsBalance: 0,
      },
    })

    // Create default services
    const defaultServices = [
      { name: 'Personal Training', description: 'Sessao individual de treinamento personalizado', durationMinutes: 60, price: 120, maxCapacity: 1, category: 'PERSONAL' as const, color: '#6366f1', coinsReward: 2 },
      { name: 'Treino em Grupo', description: 'Aula coletiva com ate 8 participantes', durationMinutes: 50, price: 45, maxCapacity: 8, category: 'GROUP' as const, color: '#10b981', coinsReward: 1 },
      { name: 'Avaliacao Fisica', description: 'Avaliacao completa com bioimpedancia e medidas', durationMinutes: 45, price: 80, maxCapacity: 1, category: 'EVALUATION' as const, color: '#f59e0b', coinsReward: 3 },
    ]

    for (const svc of defaultServices) {
      await prisma.service.create({ data: { orgId: org.id, ...svc } })
    }

    // Create default rewards
    const defaultRewards = [
      { name: 'Garrafa Exclusiva', description: 'Garrafa termica personalizada FitFlow', costCoins: 50, stock: 10, imageUrl: null },
      { name: 'Sessao Gratis', description: 'Uma sessao de personal training gratuita', costCoins: 100, stock: null, imageUrl: null },
      { name: 'Camiseta Fitness', description: 'Camiseta dry-fit com logo do studio', costCoins: 80, stock: 20, imageUrl: null },
      { name: 'Desconto 20%', description: '20% de desconto na proxima mensalidade', costCoins: 30, stock: null, imageUrl: null },
    ]

    for (const reward of defaultRewards) {
      await prisma.reward.create({ data: { orgId: org.id, ...reward, isActive: true } })
    }

  } catch (error) {
    console.error('Onboarding error:', error)
    return { error: 'Erro ao criar organizacao. Tente novamente.' }
  }

  redirect('/trainer')
}
