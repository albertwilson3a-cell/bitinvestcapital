import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { REFERRAL_CODE_PATTERN, VERIFICATION_TOKEN_PATTERN } from '../../common/crypto/tokens.js';

const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimUpper = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const trimLower = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** bcrypt only uses the first 72 bytes of input. */
export const PASSWORD_MAX_BYTES = 72;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(PASSWORD_MAX_BYTES, { message: `password must be at most ${PASSWORD_MAX_BYTES} characters` })
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/\d/, { message: 'password must contain a number' })
  password!: string;

  @IsOptional()
  @Transform(trimUpper)
  @IsString()
  @Matches(REFERRAL_CODE_PATTERN, { message: 'referralCode must be 6-16 letters or digits' })
  referralCode?: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_BYTES)
  password!: string;
}

export class VerifyEmailDto {
  @Transform(trimLower)
  @IsString()
  @Matches(VERIFICATION_TOKEN_PATTERN, { message: 'token is malformed' })
  token!: string;
}

export class ResendVerificationDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(320)
  email!: string;
}

const passwordRules = () => (target: object, key: string) => {
  IsString()(target, key);
  MinLength(8, { message: 'password must be at least 8 characters' })(target, key);
  MaxLength(PASSWORD_MAX_BYTES, { message: `password must be at most ${PASSWORD_MAX_BYTES} characters` })(target, key);
  Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })(target, key);
  Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })(target, key);
  Matches(/\d/, { message: 'password must contain a number' })(target, key);
};

export class VerifyLoginDto {
  @IsUUID()
  challengeId!: string;

  @Transform(({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(/^\d{6}$/, { message: 'code must be the 6 digits from the email' })
  code!: string;
}

export class ChallengeIdDto {
  @IsUUID()
  challengeId!: string;
}

export class ForgotPasswordDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(320)
  email!: string;
}

export class ResetPasswordDto {
  @Transform(trimLower)
  @IsString()
  @Matches(VERIFICATION_TOKEN_PATTERN, { message: 'token is malformed' })
  token!: string;

  @passwordRules()
  password!: string;

  @IsString()
  passwordConfirm!: string;
}
