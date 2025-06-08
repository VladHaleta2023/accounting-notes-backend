import { IsOptional, IsString } from "class-validator";

export class TopicSearchDto {
    @IsString({ message: "Nazwa tematu musi być tekstem" })
    @IsOptional()
    title?: string;
}