import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart with totals' })
  getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.userId, req.user.organizationId);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add variant to cart (call after QR scan, seller picks variant)' })
  add(@Body() dto: AddToCartDto, @Request() req: any) {
    return this.cartService.add(dto, req.user.userId, req.user.organizationId);
  }

  @Put(':id/quantity/:qty')
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  updateQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Param('qty', ParseIntPipe) qty: number,
    @Request() req: any,
  ) {
    return this.cartService.updateQuantity(id, qty, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.cartService.remove(id, req.user.userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  clear(@Request() req: any) {
    return this.cartService.clear(req.user.userId, req.user.organizationId);
  }
}
