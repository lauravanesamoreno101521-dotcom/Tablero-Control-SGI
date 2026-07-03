import empresturLogo from '../../Logo Emprestur.jpeg';

type AuthMode = 'login' | 'register';

type SgiAuthScreenProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  error: string;
  isSubmitting: boolean;
  usesSupabaseAuth: boolean;
  onSubmit: () => void;
};

export default function SgiAuthScreen({
  mode,
  onModeChange,
  email,
  password,
  confirmPassword,
  fullName,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onFullNameChange,
  error,
  isSubmitting,
  usesSupabaseAuth,
  onSubmit
}: SgiAuthScreenProps) {
  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans antialiased">
      <header className="bg-[#00502c] text-white border-b-2 border-[#ffd000] shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-soft border border-emerald-200 shadow-sm">
            <img src={empresturLogo} alt="Logo Emprestur" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tablero de control SGI Emprestur</h1>
            <p className="text-xs text-emerald-200">Acceso al Sistema Integrado de Gestión</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm overflow-hidden">
            <div className="flex border-b border-[#eaecf0]">
              <button
                type="button"
                onClick={() => onModeChange('login')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  isLogin
                    ? 'bg-[#00502c] text-white'
                    : 'bg-[#f8f9fa] text-gray-600 hover:bg-white'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => onModeChange('register')}
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  !isLogin
                    ? 'bg-[#00502c] text-white'
                    : 'bg-[#f8f9fa] text-gray-600 hover:bg-white'
                }`}
              >
                Registrarse
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#191c1d]">
                  {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta corporativa'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isLogin
                    ? 'Ingresa con tu correo @emprestur.com y contraseña.'
                    : 'El registro asigna rol Visualizador por defecto. Un administrador puede elevar permisos después.'}
                </p>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="auth-full-name" className="block text-xs font-semibold text-gray-600 mb-1">
                    Nombre completo
                  </label>
                  <input
                    id="auth-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => onFullNameChange(e.target.value)}
                    placeholder="Nombre y apellido"
                    autoComplete="name"
                    className="w-full px-3 py-2 text-sm border border-[#d6dce5] rounded-soft focus:outline-none focus:ring-2 focus:ring-[#006b3d]/30 focus:border-[#006b3d]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-600 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSubmit();
                  }}
                  placeholder="nombre@emprestur.com"
                  autoComplete="email"
                  className="w-full px-3 py-2 text-sm border border-[#d6dce5] rounded-soft focus:outline-none focus:ring-2 focus:ring-[#006b3d]/30 focus:border-[#006b3d]"
                />
              </div>

              {usesSupabaseAuth && (
                <>
                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-gray-600 mb-1">
                      Contraseña
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => onPasswordChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSubmit();
                      }}
                      placeholder={isLogin ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      className="w-full px-3 py-2 text-sm border border-[#d6dce5] rounded-soft focus:outline-none focus:ring-2 focus:ring-[#006b3d]/30 focus:border-[#006b3d]"
                    />
                  </div>

                  {!isLogin && (
                    <div>
                      <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-gray-600 mb-1">
                        Confirmar contraseña
                      </label>
                      <input
                        id="auth-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onSubmit();
                        }}
                        placeholder="Repite la contraseña"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 text-sm border border-[#d6dce5] rounded-soft focus:outline-none focus:ring-2 focus:ring-[#006b3d]/30 focus:border-[#006b3d]"
                      />
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-soft px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-soft border border-[#006b3d] bg-[#006b3d] text-white hover:bg-[#00502c] disabled:opacity-60 transition-colors"
              >
                {isSubmitting
                  ? isLogin
                    ? 'Ingresando...'
                    : 'Registrando...'
                  : isLogin
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
              </button>

              <div className="rounded-soft bg-[#f8f9fa] border border-[#eaecf0] px-3 py-2 text-[11px] text-gray-600">
                <p className="font-semibold text-[#00502c] mb-1">Roles del tablero</p>
                <p>
                  <span className="font-semibold">Visualizador</span> — consulta indicadores (rol por defecto al registrarse).
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Administrador</span> — edita bases de datos e informes (asignado por un admin).
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
