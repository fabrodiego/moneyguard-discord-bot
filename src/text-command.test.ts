import { describe, expect, it } from 'vitest';

const TEXT_COMMAND = /^\/?\s*(vincular|resumo|ajuda|desvincular)\b\s*([a-z0-9]{0,12})\s*$/i;

describe('comando digitado como texto', () => {
  it('reconhece /vincular com codigo', () => {
    expect(TEXT_COMMAND.exec('/vincular X62BPZ')?.slice(1)).toEqual(['vincular', 'X62BPZ']);
    expect(TEXT_COMMAND.exec('vincular x62bpz')?.slice(1)).toEqual(['vincular', 'x62bpz']);
    expect(TEXT_COMMAND.exec('/resumo')?.[1]).toBe('resumo');
  });

  it('nao confunde com lancamento', () => {
    expect(TEXT_COMMAND.exec('gastei 8 reais na cantina central')).toBeNull();
    expect(TEXT_COMMAND.exec('resumo do mes de outubro')).toBeNull();
  });
});
