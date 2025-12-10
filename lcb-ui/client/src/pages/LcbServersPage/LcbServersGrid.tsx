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

import React from 'react';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import type { MCPServer } from '../../../../shared/types';
import LcbServerCard from './components/LcbServerCard';
import Pagination from './Pagination';

const LCB_SERVERS_PER_PAGE = 8;

interface LcbServersGridProps {
  servers: MCPServer[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  isConnectionOperationInProgress: boolean;
}

export default function LcbServersGrid({
  servers,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  isConnectionOperationInProgress
}: LcbServersGridProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(servers.length / LCB_SERVERS_PER_PAGE);
  const startIndex = (currentPage - 1) * LCB_SERVERS_PER_PAGE;
  const endIndex = startIndex + LCB_SERVERS_PER_PAGE;
  const paginatedServers = servers.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [servers.length]);

  if (servers.length === 0) {
    return (
      <div
        className={style({
          borderWidth: 1,
          borderColor: 'gray-300',
          borderRadius: 'lg',
          padding: 56,
          backgroundColor: 'gray-50'
        })}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 })}>
          <span className={style({ font: 'body', fontWeight: 'medium' })} style={{ fontSize: '16px' }}>No servers configured</span>
          <span className={style({ font: 'body', color: 'gray-700' })} style={{ fontSize: '14px' }}>Click "Add Server" to connect to a server</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className={style({
          display: 'grid',
          gap: 20
        })}
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          width: '100%'
        }}
      >
        {paginatedServers.map((server, index) => (
          <div 
            key={server.id}
            style={{
              animation: 'fadeInUp 0.4s ease forwards',
              animationDelay: `${index * 0.05}s`,
              opacity: 0,
              minWidth: 0,
              width: '100%'
            }}
          >
            <LcbServerCard
              server={server}
              onDelete={onDelete}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onEdit={onEdit}
              isConnectionOperationInProgress={isConnectionOperationInProgress}
            />
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

