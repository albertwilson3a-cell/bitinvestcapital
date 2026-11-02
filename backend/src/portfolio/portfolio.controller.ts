import { Body, Controller, Get, Put } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { SetAllocationsDto } from './dto/allocation.dto.js';
import { PortfolioService } from './portfolio.service.js';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('allocations')
  get(@CurrentUser() user: AuthUser) {
    return this.portfolio.getAllocations(user.id);
  }

  /** Body: { "allocations": [{ "asset": "BTC", "percentage": 40 }, { "asset": "ETH", "percentage": 60 }] } */
  @Put('allocations')
  set(@CurrentUser() user: AuthUser, @Body() dto: SetAllocationsDto) {
    return this.portfolio.setAllocations(user.id, dto.allocations);
  }
}
