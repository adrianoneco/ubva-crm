import { useNavigate, useParams } from 'react-router-dom'

export default function ErrorPage() {
  const { code } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const errorCode = code || '500'

  const errors: Record<string, { title: string; message: string; icon: string }> = {
    '404': {
      title: 'Página não encontrada',
      message: 'A página que você está procurando não existe ou foi removida.',
      icon: '🔍'
    },
    '500': {
      title: 'Erro interno do servidor',
      message: 'Desculpe, algo deu errado no servidor. Nossa equipe foi notificada.',
      icon: '⚙️'
    },
    '503': {
      title: 'Serviço indisponível',
      message: 'O servidor está temporariamente indisponível. Tente novamente em alguns minutos.',
      icon: '🔧'
    },
    '521': {
      title: 'Servidor web caiu',
      message: 'O servidor web está offline. Estamos trabalhando para restaurá-lo.',
      icon: '📡'
    },
    '502': {
      title: 'Gateway inválido',
      message: 'Erro de comunicação com o servidor. Tente novamente em breve.',
      icon: '🌐'
    },
    '429': {
      title: 'Muitas requisições',
      message: 'Você enviou muitas requisições. Aguarde antes de tentar novamente.',
      icon: '⏱️'
    },
    '403': {
      title: 'Acesso negado',
      message: 'Você não tem permissão para acessar este recurso.',
      icon: '🔐'
    },
  }

  const error = errors[errorCode] || {
    title: 'Erro desconhecido',
    message: 'Ocorreu um erro inesperado.',
    icon: '❌'
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Code */}
        <div className="mb-6">
          <div className="text-9xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
            {errorCode}
          </div>
          <div className="text-6xl mb-4">{error.icon}</div>
        </div>

        {/* Error Title and Message */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            {error.title}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            {error.message}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            Voltar ao Início
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
          >
            Voltar
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm mb-4">
            Se o problema persistir, entre em contato com nosso suporte
          </p>
          <button
            onClick={() => window.location.href = 'mailto:support@ubva.com.br'}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            📧 Enviar email para suporte
          </button>
        </div>
      </div>
    </div>
  )
}
