import { Injectable } from '@nestjs/common';

export interface FilterOption {
  value: string | number;
  label: string;
}

@Injectable()
export class FilterOptionsService {
  private readonly inventoryStatusOptions: FilterOption[] = [
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
  ];

  private readonly paymentMethodsOptions: FilterOption[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  ];

  private readonly paymentStatusesOptions: FilterOption[] = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'REFUNDED', label: 'Refunded' },
  ];

  private readonly activityLevelsOptions: FilterOption[] = [
    { value: 'Low Activity', label: 'Low Activity' },
    { value: 'Moderate Activity', label: 'Moderate Activity' },
    { value: 'High Activity', label: 'High Activity' },
  ];

  private readonly httpMethodsOptions: FilterOption[] = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'DELETE', label: 'DELETE' },
  ];

  private readonly plantSizesOptions: FilterOption[] = [
    { value: 'TINY', label: 'Tiny' },
    { value: 'SMALL', label: 'Small' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LARGE', label: 'Large' },
    { value: 'EXTRA_LARGE', label: 'Extra Large' },
  ];

  // Map of all available filter types
  private readonly filterOptionsMap: Record<string, FilterOption[]> = {
    'inventory-status': this.inventoryStatusOptions,
    'payment-methods': this.paymentMethodsOptions,
    'payment-statuses': this.paymentStatusesOptions,
    'activity-levels': this.activityLevelsOptions,
    'http-methods': this.httpMethodsOptions,
    'plant-sizes': this.plantSizesOptions,
  };

  getInventoryStatus() {
    return {
      success: true,
      data: this.inventoryStatusOptions,
    };
  }

  getPaymentMethods() {
    return {
      success: true,
      data: this.paymentMethodsOptions,
    };
  }

  getPaymentStatuses() {
    return {
      success: true,
      data: this.paymentStatusesOptions,
    };
  }

  getActivityLevels() {
    return {
      success: true,
      data: this.activityLevelsOptions,
    };
  }

  getHttpMethods() {
    return {
      success: true,
      data: this.httpMethodsOptions,
    };
  }

  getPlantSizes() {
    return {
      success: true,
      data: this.plantSizesOptions,
    };
  }

  /**
   * Get filter options by type
   * @param optionType - The type of filter option to retrieve
   * @returns Filter options for the specified type
   */
  getFilterOptionsByType(optionType: string) {
    const options = this.filterOptionsMap[optionType];
    
    if (!options) {
      return {
        success: false,
        error: `Invalid filter option type: ${optionType}`,
        availableTypes: Object.keys(this.filterOptionsMap),
      };
    }

    return {
      success: true,
      data: options,
    };
  }

  /**
   * Get all available filter option types
   */
  getAllFilterTypes() {
    return {
      success: true,
      data: Object.keys(this.filterOptionsMap),
    };
  }

  /**
   * Get all filter options at once
   */
  getAllFilterOptions() {
    return {
      success: true,
      data: this.filterOptionsMap,
    };
  }

  /**
   * Determine inventory status based on stock quantity
   * @param stockQty - The stock quantity
   * @param lowStockThreshold - Threshold for low stock (default: 10)
   * @returns The inventory status
   */
  determineInventoryStatus(
    stockQty: number,
    lowStockThreshold: number = 10,
  ): string {
    if (stockQty > lowStockThreshold) {
      return 'In Stock';
    } else if (stockQty > 0) {
      return 'Low Stock';
    }
    return 'Out of Stock';
  }

  /**
   * Determine activity level based on count
   * @param count - The count/scan count
   * @param lowActivityThreshold - Threshold for low activity (default: 5)
   * @param moderateActivityThreshold - Threshold for moderate activity (default: 15)
   * @returns The activity level
   */
  determineActivityLevel(
    count: number,
    lowActivityThreshold: number = 5,
    moderateActivityThreshold: number = 15,
  ): string {
    if (count >= moderateActivityThreshold) {
      return 'High Activity';
    } else if (count >= lowActivityThreshold) {
      return 'Moderate Activity';
    }
    return 'Low Activity';
  }
}
