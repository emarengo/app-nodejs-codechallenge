import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsNotSameAccountConstraint implements ValidatorConstraintInterface {
  validate(accountExternalIdCredit: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const accountExternalIdDebit = (args.object as any)[relatedPropertyName];
    
    return accountExternalIdDebit !== accountExternalIdCredit;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Credit account cannot be the same as debit account';
  }
}

export function IsNotSameAccount(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsNotSameAccountConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsValidTransactionAmountConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'number') {
      return false;
    }

    // Check if value is positive
    if (value <= 0) {
      return false;
    }

    // Check maximum 2 decimal places
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return false;
    }

    // Check reasonable maximum amount (100 million)
    if (value > 100000000) {
      return false;
    }

    // Check minimum amount (1 cent)
    if (value < 0.01) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Transaction amount must be a positive number with maximum 2 decimal places, between 0.01 and 100,000,000';
  }
}

export function IsValidTransactionAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidTransactionAmountConstraint,
    });
  };
}

@ValidatorConstraint({ async: false })
export class IsValidUUIDFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }

    // UUID v4 regex pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid UUID format. Must be a valid UUID v4';
  }
}

export function IsValidUUIDFormat(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidUUIDFormatConstraint,
    });
  };
} 