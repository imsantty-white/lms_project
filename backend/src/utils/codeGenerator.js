// src/utils/codeGenerator.js

function generateUniqueCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Caracteres permitidos
    let code = '';
    for (let i = 0; i < length; i++) {
      // Selecciona un caracter aleatorio y lo añade al código
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }
  
  module.exports = { generateUniqueCode }; // Exportamos la función