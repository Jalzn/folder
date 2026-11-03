import { AppError } from '../errors.js';
export const nameErrors = {
  invalidNameCharacters: (thing: string) =>
    new AppError('VALIDATION', `Use só letras, números, espaços e símbolos no nome da ${thing}.`),
  nameRequired: (thing: string) => new AppError('VALIDATION', `Dê um nome à ${thing}.`),
  nameTooLong: (thing: string, maxChars: number) =>
    new AppError('VALIDATION', `Use até ${maxChars} caracteres no nome da ${thing}.`),
  nameTaken: (thing: string, name: string, suffix: string) =>
    new AppError('DOMAIN_RULE', `Já existe uma ${thing} ${name}.${suffix}`),
};
