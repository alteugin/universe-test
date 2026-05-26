import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca-Cola 0.33L', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'Classic Coca-Cola, 330ml can' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 1.99, minimum: 0, description: 'Up to 2 decimal places' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;
}
