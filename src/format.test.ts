import { describe, expect, it } from 'vitest';
import { dateBr, money, percentText, progressBar } from './format.js';

describe('format', () => {
  it('formata reais', () => {
    expect(money(8)).toBe('R$ 8,00');
    expect(money(1234.5)).toBe('R$ 1.234,50');
  });

  it('formata datas', () => {
    expect(dateBr('2026-11-02')).toBe('02/11/2026');
  });

  it('desenha a barra de progresso', () => {
    expect(progressBar(0)).toBe('▱▱▱▱▱▱▱▱▱▱');
    expect(progressBar(45)).toBe('▰▰▰▰▰▱▱▱▱▱');
    expect(progressBar(150)).toBe('▰▰▰▰▰▰▰▰▰▰');
  });

  it('formata porcentagem', () => {
    expect(percentText(4)).toBe('4,0%');
  });
});
