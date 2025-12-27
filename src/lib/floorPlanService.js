import { supabase } from './supabase'

/**
 * FloorPlanService
 * Serviço para gerenciar o salvamento e carregamento de plantas baixas no Supabase.
 */
export const FloorPlanService = {
  
  /**
   * Salva (cria ou atualiza) uma planta baixa.
   * Se um ID for fornecido, tenta atualizar. Caso contrário, cria um novo.
   * Mas para o MVP de "Single Save" (substituindo localStorage), vamos focar em ter UM projeto principal por enquanto,
   * ou permitir múltiplos. Vamos assumir suporte a múltiplos, mas o UI atual carrega "O" projeto.
   * Estratégia Inicial: Upsert num projeto padrão ou criar novo se não existir.
   */
  async saveFloorPlan(floorPlanData, planId = null, name = 'Meu Projeto') {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Usuário não autenticado')

    // Prepara o payload
    const payload = {
      user_id: user.id,
      data: floorPlanData,
      name: name,
      updated_at: new Date()
    }

    if (planId) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('floor_plans')
        .update(payload)
        .eq('id', planId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Criar novo: Verificar Limites do Plano
      const { allowed, reason } = await this.checkPlanLimits()
      
      if (!allowed) {
          throw new Error(reason)
      }

      const { data, error } = await supabase
        .from('floor_plans')
        .insert(payload)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  },

  /**
   * Verifica se o usuário pode criar mais projetos com base no seu plano.
   * Retorna { allowed: boolean, reason: string, isPremium: boolean }
   */
  async checkPlanLimits() {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Usuário não autenticado')

      // Simulação de plano (Idealmente viria de uma tabela 'profiles' ou claims do usuário)
      const plan = user.user_metadata?.plan || 'free'
      const limit = plan === 'pro' ? 100 : 1;
      const isPremium = plan === 'pro'

      const { count, error: countError } = await supabase
        .from('floor_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (countError) throw countError

      if (count >= limit) {
          return { 
              allowed: false, 
              reason: `Limite do plano ${plan.toUpperCase()} atingido (${limit} Projeto${limit > 1 ? 's' : ''}).`,
              isPremium: isPremium
          }
      }

      return { allowed: true, reason: null, isPremium: isPremium }
  },

  /**
   * Busca o projeto mais recente do usuário.
   * Ideal para substituir o comportamento do localStorage na inicialização.
   */
  async getMostRecentFloorPlan() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('floor_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found", que é ok
       console.error('Erro ao buscar planta:', error)
       return null
    }

    return data
  },

  /**
   * Lista todos os projetos do usuário
   */
  async listFloorPlans() {
    const { data, error } = await supabase
      .from('floor_plans')
      .select('id, name, updated_at, created_at')
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  /**
   * Exclui um projeto pelo ID
   */
  async deleteFloorPlan(id) {
    const { error } = await supabase
      .from('floor_plans')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  /**
   * Busca um projeto específico pelo ID
   */
  async getFloorPlanById(id) {
    const { data, error } = await supabase
      .from('floor_plans')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
}
