import { PartialType } from '@nestjs/swagger';
import { CreateMenuMasterDto } from './create-menu-master.dto';

export class UpdateMenuMasterDto extends PartialType(CreateMenuMasterDto) {}