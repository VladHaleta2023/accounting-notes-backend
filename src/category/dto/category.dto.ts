import { IsNotEmpty, IsString } from "class-validator";

export class CategoryDto {
    @IsString({ message: "Nazwa powinna być tekstem" })
    @IsNotEmpty({ message: "Nazwa nie może być pusta" })
    name: string;
} 