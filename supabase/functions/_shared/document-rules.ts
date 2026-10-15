export const documentRules = {
  DNI: {
    maxLength: 8,
    numeric: true,
    invalidCharacters: /[^0-9]/g,
    pattern: /^[0-9]{8}$/,
    hint: "8 dígitos, sin letras ni espacios.",
    message: "El DNI debe tener 8 dígitos",
  },
  RUC: {
    maxLength: 11,
    numeric: true,
    invalidCharacters: /[^0-9]/g,
    pattern: /^(10|20)[0-9]{9}$/,
    hint: "11 dígitos. Debe comenzar con 10 o 20.",
    message: "RUC de 11 dígitos, con prefijo 10 o 20",
  },
  CE: {
    maxLength: 30,
    numeric: false,
    invalidCharacters: /[^A-Za-z0-9-]/g,
    pattern: /^[A-Za-z0-9-]{1,30}$/,
    hint: "Hasta 30 caracteres: letras, números o guion.",
    message: "El CE admite hasta 30 caracteres: letras, números o guion",
  },
  Pasaporte: {
    maxLength: 30,
    numeric: false,
    invalidCharacters: /[^A-Za-z0-9]/g,
    pattern: /^[A-Za-z0-9]{1,30}$/,
    hint: "Hasta 30 caracteres: letras y números, sin espacios.",
    message: "El pasaporte admite hasta 30 caracteres: letras y números",
  },
} as const;
