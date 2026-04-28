import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from './tax.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

export type AppliedTaxBreakdown = {
  taxType: string;
  percentage: number;
  amount: number;
};

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
  ) {}

  async create(organizationId: string, dto: CreateTaxDto) {
    const row = this.taxRepo.create({
      organizationId,
      taxType: dto.taxType.trim(),
      percentage: Number(Number(dto.percentage).toFixed(2)),
      status: dto.status ?? true,
    });
    return this.taxRepo.save(row);
  }

  async findAll(organizationId: string) {
    return this.taxRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
  }

  async findActive(organizationId: string) {
    return this.taxRepo.find({
      where: { organizationId, status: true },
      order: { createdAt: 'ASC' },
    });
  }

  async update(organizationId: string, id: number, dto: UpdateTaxDto) {
    const row = await this.taxRepo.findOne({ where: { id, organizationId } });
    if (!row) {
      throw new NotFoundException('Tax not found');
    }

    if (dto.taxType !== undefined) {
      row.taxType = dto.taxType.trim();
    }
    if (dto.percentage !== undefined) {
      row.percentage = Number(Number(dto.percentage).toFixed(2));
    }
    if (dto.status !== undefined) {
      row.status = dto.status;
    }

    return this.taxRepo.save(row);
  }

  async updateStatus(organizationId: string, id: number, status: boolean) {
    const row = await this.taxRepo.findOne({ where: { id, organizationId } });
    if (!row) {
      throw new NotFoundException('Tax not found');
    }
    row.status = status;
    return this.taxRepo.save(row);
  }

  async remove(organizationId: string, id: number) {
    const row = await this.taxRepo.findOne({ where: { id, organizationId } });
    if (!row) {
      throw new NotFoundException('Tax not found');
    }
    await this.taxRepo.remove(row);
    return { message: 'Tax removed successfully' };
  }

  async computeForAmount(
    organizationId: string,
    taxableAmount: number,
  ): Promise<{
    totalTaxPercentage: number;
    taxAmount: number;
    finalTotal: number;
    breakdown: AppliedTaxBreakdown[];
  }> {
    const activeTaxes = await this.findActive(organizationId);
    const normalizedTaxableAmount = Number(Math.max(0, taxableAmount).toFixed(2));

    const totalTaxPercentage = Number(
      activeTaxes.reduce((sum, tax) => sum + Number(tax.percentage || 0), 0).toFixed(2),
    );

    const breakdown = activeTaxes.map((tax) => {
      const pct = Number(Number(tax.percentage).toFixed(2));
      const amount = Number(((normalizedTaxableAmount * pct) / 100).toFixed(2));
      return {
        taxType: tax.taxType,
        percentage: pct,
        amount,
      };
    });

    const taxAmount = Number(
      breakdown.reduce((sum, line) => sum + line.amount, 0).toFixed(2),
    );
    const finalTotal = Number((normalizedTaxableAmount + taxAmount).toFixed(2));

    return {
      totalTaxPercentage,
      taxAmount,
      finalTotal,
      breakdown,
    };
  }
}
