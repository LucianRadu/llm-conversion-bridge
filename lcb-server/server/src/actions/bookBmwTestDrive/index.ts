/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import type { ActionHandlerResult } from '../../types';
import { logger } from '../../utils/logger';

// BMW Dealership locations (mock data)
const DEALERSHIPS: Record<string, { name: string; address: string; phone: string }> = {
  Manhattan: {
    name: 'BMW of Manhattan',
    address: '555 W 57th St, New York, NY 10019',
    phone: '(212) 586-2269'
  }
};

// Available days for test drive (Dec 2025)
const AVAILABLE_DAYS = [
  { day: 'Mon', date: 8, month: 'December', year: 2025, available: true },
  { day: 'Tue', date: 9, month: 'December', year: 2025, available: true },
  { day: 'Wed', date: 10, month: 'December', year: 2025, available: true },
  { day: 'Thu', date: 11, month: 'December', year: 2025, available: true },
  { day: 'Fri', date: 12, month: 'December', year: 2025, available: true },
  { day: 'Sat', date: 13, month: 'December', year: 2025, available: true },
  { day: 'Sun', date: 14, month: 'December', year: 2025, available: false },
  { day: 'Mon', date: 15, month: 'December', year: 2025, available: true }
];

// Time slots
const TIME_SLOTS = [
  '9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm',
  '2:00 pm', '3:00 pm', '4:00 pm', '5:00 pm'
];

interface BookBmwTestDriveArgs {
  vehicleModel: string;
  location: string;
}

async function handler(args: BookBmwTestDriveArgs): Promise<ActionHandlerResult> {
  const startTime = Date.now();
  const { vehicleModel, location } = args;
  logger.info(`MCP: action=tool_invoked;tool=bookBmwTestDrive;status=starting;model=${vehicleModel};location=${location}`);

  try {
    logger.info(`MCP: action=tool_execution;tool=bookBmwTestDrive;status=loading_booking`);

    const dealership = DEALERSHIPS[location] || DEALERSHIPS.Manhattan;

    const responseText = `Ready to book a test drive for the ${vehicleModel}. ` +
      `Select your preferred date and time at ${dealership.name}.`;

    const result = {
      content: [{
        type: 'text' as const,
        text: responseText
      }],
      structuredContent: {
        vehicle: {
          model: vehicleModel
        },
        dealership,
        availableDays: AVAILABLE_DAYS,
        timeSlots: TIME_SLOTS
      },
      success: true,
      timestamp: Date.now()
    };

    const executionTime = Date.now() - startTime;
    logger.info(
      `MCP: action=tool_completed;tool=bookBmwTestDrive;status=success;` +
      `duration_ms=${executionTime};model=${vehicleModel};location=${location}`
    );

    return result;
  } catch (error: unknown) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      `MCP: action=tool_completed;tool=bookBmwTestDrive;status=error;` +
      `duration_ms=${executionTime};error=${errorMessage}`
    );

    return {
      content: [{
        type: 'text' as const,
        text: `Error in bookBmwTestDrive: ${errorMessage}`
      }],
      success: false,
      error: errorMessage,
      timestamp: Date.now()
    };
  }
}

export { handler };

