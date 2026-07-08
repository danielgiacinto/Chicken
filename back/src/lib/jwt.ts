import { SignJWT, jwtVerify } from 'jose';

const DURACION_TOKEN = '24h';

function obtenerSecreto(): Uint8Array {
  const secreto = process.env.JWT_SECRETO;
  if (!secreto) {
    throw new Error('Falta JWT_SECRETO');
  }
  return new TextEncoder().encode(secreto);
}

export async function crearToken(usuario: string): Promise<string> {
  return new SignJWT({ sub: usuario })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(DURACION_TOKEN)
    .sign(obtenerSecreto());
}

export async function verificarToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, obtenerSecreto());
  if (!payload.sub) {
    throw new Error('Token inválido');
  }
  return { sub: payload.sub };
}
