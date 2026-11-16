# Esquema de hardware (issue #63)

Diagrama de blocos, BOM (C-02) e folhas de cálculo de fonte derivam do [ADR-005](../adr/005-escolha-do-hardware.md).

| Entrega #63 | Base no ADR-005 |
|---|---|
| Diagrama painel | ESP32 + display I2C, fonte 5 V / ≥ 1 A |
| Diagrama totem | ESP32 + leitor RFID + LED, fonte 5 V / ≥ 1,5 A |
| Lista de componentes | Inventário do laboratório ou orçamento; ver tabela "Plataforma" no ADR |
| Consumo e fonte | Tabelas de pico painel (~340 mA) e totem (~460 mA) × 1,30 (RNF-11) |

Arquivos do esquema (diagrama, BOM) serão adicionados nesta pasta no commit que fecha a #63.