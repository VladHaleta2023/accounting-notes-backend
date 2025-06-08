import { IsOptional, IsString } from "class-validator";

export class ContentDto {
    @IsOptional()
    @IsString({ message: "Tekst tematu musi być tekstem" })
    content?: string;
}