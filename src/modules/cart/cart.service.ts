import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(PlantVariant)
    private readonly variantRepo: Repository<PlantVariant>,
  ) {}

  async add(dto: AddToCartDto, userId: string, organizationId: string) {
    const variant = await this.variantRepo.findOne({
      where: { id: dto.variantId, organizationId, status: true },
      relations: ['plant'],
    });

    if (!variant || !variant.plant?.status) {
      throw new NotFoundException('Variant not found');
    }

    // If already in cart → increment quantity
    const existing = await this.cartRepo.findOne({
      where: { userId, variantId: dto.variantId },
    });

    if (existing) {
      existing.quantity += dto.quantity;
      await this.cartRepo.save(existing);
      return this.getCart(userId, organizationId);
    }

    await this.cartRepo.save(
      this.cartRepo.create({
        userId,
        organizationId,
        variantId: dto.variantId,
        quantity: dto.quantity,
      }),
    );

    return this.getCart(userId, organizationId);
  }

  async updateQuantity(cartItemId: number, quantity: number, userId: string) {
    const item = await this.cartRepo.findOne({ where: { id: cartItemId, userId } });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity < 1) throw new BadRequestException('Quantity must be at least 1');
    item.quantity = quantity;
    await this.cartRepo.save(item);
    return this.getCart(userId, item.organizationId);
  }

  async remove(cartItemId: number, userId: string) {
    const item = await this.cartRepo.findOne({ where: { id: cartItemId, userId } });
    if (!item) throw new NotFoundException('Cart item not found');
    const orgId = item.organizationId;
    await this.cartRepo.remove(item);
    return this.getCart(userId, orgId);
  }

  async getCart(userId: string, organizationId: string) {
    const items = await this.cartRepo.find({
      where: { userId, organizationId },
      relations: ['variant', 'variant.plant'],
      order: { createdAt: 'ASC' },
    });

    const cartItems = items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: Number(item.variant.price),
      totalPrice: Number(item.variant.price) * item.quantity,
      variant: {
        id: item.variant.id,
        size: item.variant.size,
        sku: item.variant.sku,
        price: Number(item.variant.price),
      },
      plant: {
        id: item.variant.plant.id,
        name: item.variant.plant.name,
        imageUrl: item.variant.plant.imageUrl,
      },
    }));

    const totalAmount = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

    return { items: cartItems, totalItems, totalAmount };
  }

  async clear(userId: string, organizationId: string) {
    await this.cartRepo.delete({ userId, organizationId });
    return { items: [], totalItems: 0, totalAmount: 0 };
  }
}
