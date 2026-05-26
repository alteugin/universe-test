import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import {
  ProductListResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product',
    description:
      'Writes the product + a `product.created` event in one DB transaction. Outbox poller drains the event to SQS asynchronously.',
  })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.products.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product',
    description:
      'Deletes the product + writes a `product.deleted` event in one DB transaction.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.products.delete(id);
  }

  @Get()
  @ApiOperation({ summary: 'List products with offset pagination' })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  list(@Query() query: ListProductsDto): Promise<ProductListResponseDto> {
    return this.products.list(query);
  }
}
