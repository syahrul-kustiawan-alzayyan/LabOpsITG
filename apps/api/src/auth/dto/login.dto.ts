import { IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  /** Email lengkap atau username pendek (mis. "instruktur01"). */
  @IsString()
  @Matches(/^[^\s@]+(@[^\s@]+)?$/, { message: "Email atau username tidak valid" })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
