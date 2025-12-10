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

import { TextField } from '@react-spectrum/s2';

interface LcbServersFilterProps {
  filterText: string;
  onFilterChange: (text: string) => void;
  isDisabled: boolean;
}

export default function LcbServersFilter({
  filterText,
  onFilterChange,
  isDisabled
}: LcbServersFilterProps) {
  return (
    <TextField
      label="Filter"
      description="Type at least 3 characters to filter servers"
      value={filterText}
      onChange={onFilterChange}
      UNSAFE_style={{ width: '100%', maxWidth: 'var(--spectrum-global-dimension-size-6000)' }}
      isDisabled={isDisabled}
    />
  );
}

