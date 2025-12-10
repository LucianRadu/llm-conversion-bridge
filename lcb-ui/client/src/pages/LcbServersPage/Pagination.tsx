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

import { ActionButton } from "@react-spectrum/s2";
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft';
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): number[] => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage === 1) {
      return [1, 2, 3];
    } else if (currentPage === totalPages) {
      return [totalPages - 2, totalPages - 1, totalPages];
    } else {
      return [currentPage - 1, currentPage, currentPage + 1];
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
      <ActionButton
        isDisabled={currentPage === 1}
        onPress={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </ActionButton>

      {pageNumbers.map((pageNum) => (
        <ActionButton
          key={pageNum}
          onPress={() => onPageChange(pageNum)}
          UNSAFE_style={{
            fontWeight: currentPage === pageNum ? 'bold' : 'normal',
            backgroundColor: currentPage === pageNum ? 'var(--spectrum-global-color-gray-200)' : 'transparent'
          }}
        >
          <span>{pageNum}</span>
        </ActionButton>
      ))}

      <ActionButton
        isDisabled={currentPage === totalPages}
        onPress={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight />
      </ActionButton>
    </div>
  );
}

