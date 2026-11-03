import { AppError } from '@tinyfold/core/application';
export const authErrors = {
  wrongCurrentPassword: () => new AppError('VALIDATION', 'A senha atual está incorreta.'),
  samePassword: () => new AppError('VALIDATION', 'Escolha uma senha diferente da atual.'),
  passwordConflict: () =>
    new AppError('VERSION_CONFLICT', 'A senha foi alterada em outro dispositivo. Entre novamente.'),
  sessionEnded: () => new AppError('UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo.'),
  wrongPassword: () => new AppError('UNAUTHENTICATED', 'Senha incorreta. Tente novamente.'),
  passwordChanged: () => new AppError('UNAUTHENTICATED', 'A senha mudou. Entre novamente.'),
  ownerMissing: () => new AppError('NOT_FOUND', 'A conta ainda não foi criada.'),
  revokeCurrentSession: () => new AppError('VALIDATION', 'Use Sair para encerrar esta sessão.'),
  offsetTimeZone: () =>
    new AppError('VALIDATION', 'Use o nome de um fuso horário, como America/Sao_Paulo, e não um deslocamento.'),
  unknownTimeZone: () => new AppError('VALIDATION', 'Fuso horário desconhecido.'),
  loginRateLimited: () => new AppError('RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto e tente novamente.'),
};
