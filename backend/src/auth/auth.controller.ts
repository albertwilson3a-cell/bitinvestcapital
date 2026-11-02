import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser, Public } from './decorators.js';
import { ChallengeIdDto, ForgotPasswordDto, LoginDto, RegisterDto, ResendVerificationDto, ResetPasswordDto, VerifyEmailDto, VerifyLoginDto } from './dto/auth.dto.js';
import { LocalAuthGuard } from './guards.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Req() req: Request, @Body() _dto: LoginDto) {
    return this.auth.startLogin(req.user as User);
  }

  /** Second sign-in step: the 6-digit code from the email. */
  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  verifyLogin(@Body() dto: VerifyLoginDto) {
    return this.auth.verifyLogin(dto.challengeId, dto.code);
  }

  @Public()
  @Post('login/resend')
  @HttpCode(HttpStatus.OK)
  resendLogin(@Body() dto: ChallengeIdDto) {
    return this.auth.resendLoginCode(dto.challengeId);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirm) throw new BadRequestException(['passwords do not match']);
    return this.auth.resetPassword(dto.token, dto.password);
  }

  /** Target of the emailed link (via the frontend's /verify page). */
  @Public()
  @Get('verify')
  verifyFromQuery(@Query() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyFromBody(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  resend(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.users.getProfile(user.id);
    if (!profile) throw new NotFoundException();
    return profile;
  }
}
