export interface EntregaEmail {
  enviar(destino: string, assunto: string, corpo: string): Promise<void>;
}
