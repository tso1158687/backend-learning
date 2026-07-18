import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  price!: number;
}
