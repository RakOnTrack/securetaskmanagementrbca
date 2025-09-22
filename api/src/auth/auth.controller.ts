import { Controller, Post, Body, UseGuards, Request, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto, RegisterDto, AuthResponseDto } from '@rbcaproject/data';
import { AuthService } from './auth.service';

export const Public = () => SetMetadata('isPublic', true);

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, req);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Request() req): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, req);
  }
}
