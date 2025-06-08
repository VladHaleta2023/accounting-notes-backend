import { IsNotEmpty, IsString } from "class-validator";

export class TopicDto {
    @IsString({ message: "Nazwa tematu musi być tekstem" })
    @IsNotEmpty({ message: "Nazwa tematu nie może być pusta" })
    title: string;
}