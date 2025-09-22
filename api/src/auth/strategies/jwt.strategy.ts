import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, JwtPayload } from '@rbcaproject/data';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['organization', 'userRoles', 'userRoles.role']
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    // Update payload with current user data
    const roles = user.userRoles
      .filter(ur => ur.isActive)
      .map(ur => ur.role.name);

    return {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles,
    };
  }
}
