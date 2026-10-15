import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Sequelize, QueryTypes } from 'sequelize';
import { verify } from 'argon2';
import { randomUUID } from 'node:crypto';
import type { LoginDto, UserDto } from './auth.dto.js';

type User = UserDto & { password_hash: string; active: boolean };
@Injectable()
export class AuthService {
  constructor(
    private readonly db: Sequelize,
    private readonly jwt: JwtService,
  ) {}
  async login(input: LoginDto) {
    const [user] = await this.db.query<User>(
      'SELECT * FROM sellers WHERE email = :email AND active = true',
      {
        replacements: { email: input.email.trim().toLowerCase() },
        type: QueryTypes.SELECT,
      },
    );
    if (!user || !(await verify(user.password_hash, input.password)))
      throw new UnauthorizedException('Credenciales incorrectas');
    const sessionId = randomUUID();
    await this.db.query(
      "INSERT INTO sessions (id, seller_id, expires_at) VALUES (:id, :seller, NOW() + INTERVAL '8 hours')",
      { replacements: { id: sessionId, seller: user.id } },
    );
    return {
      token: await this.jwt.signAsync({ sub: user.id, sid: sessionId }),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
  async authenticate(token?: string): Promise<UserDto & { sid: string }> {
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; sid: string }>(
        token,
        { algorithms: ['HS256'] },
      );
      const [user] = await this.db.query<UserDto>(
        'SELECT s.id, s.name, s.email FROM sellers s JOIN sessions t ON t.seller_id = s.id WHERE s.id = :id AND t.id = :sid AND t.expires_at > NOW() AND s.active = true',
        {
          replacements: { id: payload.sub, sid: payload.sid },
          type: QueryTypes.SELECT,
        },
      );
      if (!user) throw new Error('Expired session');
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        sid: payload.sid,
      };
    } catch {
      throw new UnauthorizedException('Sesión expirada');
    }
  }
  async logout(sid: string) {
    await this.db.query('DELETE FROM sessions WHERE id = :sid', {
      replacements: { sid },
    });
  }
}
