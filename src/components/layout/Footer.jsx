import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Componente Footer (Rodapé)
 * Exibido na parte inferior das páginas públicas (Home, Login).
 * Contém a marca, links de navegação e um aviso legal sobre cálculos de engenharia.
 */
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg">ProjectGrid</h3>
            </div>
            <p className="text-sm text-gray-400 mt-2">A plataforma completa para o eletricista profissional.</p>
          </div>
          <div className="text-sm">
            <h4 className="font-semibold uppercase tracking-wider text-gray-400">Links</h4>
            <Link to="/privacy" className="block mt-2 hover:text-indigo-300">Política de Privacidade</Link>
            <Link to="/terms" className="block mt-2 hover:text-indigo-300">Termos de Uso</Link>
          </div>
          <div className="text-sm bg-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold uppercase tracking-wider text-gray-400">Aviso Importante</h4>
            <p className="mt-2 text-gray-300">As ferramentas e cálculos fornecidos são para fins informativos e educacionais. É imprescindível que todos os projetos sejam validados por um profissional qualificado e sigam as normas técnicas vigentes (NBR 5410 e outras) antes da execução.</p>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} ProjectGrid. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}

export default Footer
