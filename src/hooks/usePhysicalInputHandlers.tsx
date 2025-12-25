import { useState, useEffect, useCallback } from "react";

/**
 * Hook para padronizar o tratamento de inputs de dados físicos
 * Garante consistência em toda a aplicação para peso, altura e idade
 */
export function usePhysicalInputHandlers(initialHeight: number | null = null) {
  // Estado local para edição livre do campo altura - formato X,XX
  const [heightInput, setHeightInput] = useState(() => {
    if (initialHeight) {
      const meters = (initialHeight / 100).toFixed(2);
      return meters.replace('.', ',');
    }
    return "";
  });

  // Sincronizar heightInput quando height mudar externamente
  const syncHeightInput = useCallback((height: number | null) => {
    if (height) {
      const meters = (height / 100).toFixed(2);
      const formatted = meters.replace('.', ',');
      setHeightInput(formatted);
    } else {
      setHeightInput("");
    }
  }, []);

  /**
   * Handler para campos de peso - max 3 dígitos, apenas números
   */
  const handleWeightInput = useCallback((value: string): number | null => {
    const digits = value.replace(/[^0-9]/g, '').substring(0, 3);
    return digits ? parseFloat(digits) : null;
  }, []);

  /**
   * Handler para campo de altura - formato X,XX (metros)
   * Retorna o valor em centímetros para armazenamento
   */
  const handleHeightInput = useCallback((rawValue: string): { displayValue: string; heightInCm: number | null } => {
    const previousValue = heightInput;
    const isDeleting = rawValue.length < previousValue.length;
    
    // Se o usuário apagou tudo, permitir campo vazio
    if (rawValue === '' || rawValue === ',') {
      setHeightInput('');
      return { displayValue: '', heightInCm: null };
    }
    
    // Remove tudo exceto números
    let digits = rawValue.replace(/[^0-9]/g, '');
    
    // Se não há dígitos após limpar, esvaziar
    if (digits.length === 0) {
      setHeightInput('');
      return { displayValue: '', heightInCm: null };
    }
    
    // Limita a 3 dígitos (formato X,XX = altura máxima 2,99m)
    if (digits.length > 3) {
      digits = digits.substring(0, 3);
    }
    
    // Se está deletando e só tem 1 dígito, permitir sem vírgula
    if (isDeleting && digits.length === 1) {
      setHeightInput(digits);
      const numericValue = parseFloat(digits + '.0');
      const heightInCm = (!isNaN(numericValue) && numericValue > 0) 
        ? Math.round(numericValue * 100) 
        : null;
      return { displayValue: digits, heightInCm };
    }
    
    // Formata automaticamente com vírgula após primeiro dígito
    let formatted = '';
    if (digits.length === 1) {
      formatted = digits + ',';
    } else {
      formatted = digits[0] + ',' + digits.substring(1);
    }
    
    setHeightInput(formatted);
    
    // Converte para cm para armazenamento
    const numericValue = parseFloat(digits[0] + '.' + (digits.substring(1) || '0'));
    const heightInCm = (!isNaN(numericValue) && numericValue > 0) 
      ? Math.round(numericValue * 100) 
      : null;
    
    return { displayValue: formatted, heightInCm };
  }, [heightInput]);

  /**
   * Handler para blur do campo altura - completa com zeros se necessário
   */
  const handleHeightBlur = useCallback((heightInCm: number | null) => {
    if (heightInCm) {
      const meters = (heightInCm / 100).toFixed(2);
      setHeightInput(meters.replace('.', ','));
    }
  }, []);

  /**
   * Handler para campo de idade - max 3 dígitos, apenas números inteiros
   */
  const handleAgeInput = useCallback((value: string): number | null => {
    const digits = value.replace(/[^0-9]/g, '').substring(0, 3);
    return digits ? parseInt(digits) : null;
  }, []);

  return {
    heightInput,
    setHeightInput,
    syncHeightInput,
    handleWeightInput,
    handleHeightInput,
    handleHeightBlur,
    handleAgeInput,
  };
}
