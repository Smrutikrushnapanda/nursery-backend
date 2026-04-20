import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { QrCode } from './qr-code.entity';
import { Plant } from '../plants/plant.entity';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrCode)
    private readonly qrRepo: Repository<QrCode>,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
  ) {}

  async generate(plantId: number, organizationId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) throw new NotFoundException('Plant not found');

    const existing = await this.qrRepo.findOne({ where: { plantId } });
    if (existing) throw new ConflictException('QR code already exists for this plant');

    const code = `PLT-${organizationId.slice(0, 8)}-${plantId}-${Date.now()}`;
    const qrImageBase64 = await QRCode.toDataURL(code);

    const qrCode = this.qrRepo.create({
      code,
      plantId,
      organizationId,
      qrImageBase64,
    });

    const saved = await this.qrRepo.save(qrCode);

    // Store the QR code reference on the plant
    await this.plantRepo.update(plantId, { qrCodeUrl: code });

    return { code, qrImageBase64, plantId, id: saved.id };
  }

  async scan(code: string) {
    const qrCode = await this.qrRepo.findOne({
      where: { code },
      relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
    });

    if (!qrCode) throw new NotFoundException('QR code not found');

    return {
      code: qrCode.code,
      plant: qrCode.plant,
    };
  }
}
