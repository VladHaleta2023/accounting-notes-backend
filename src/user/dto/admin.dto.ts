import { IsNotEmpty, IsString } from "class-validator";

export class LoginAdminAuthDto {
    @IsString({ message: "Użytkownika musi być tekstem"})
    @IsNotEmpty({ message: "Użytkownik nie może być pusty" })
    username: string;

    @IsString({ message: "Hasło musi być tekstem"})
    @IsNotEmpty({ message: "Hasło nie może być puste" })
    password: string;
}