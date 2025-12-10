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

import { useState } from 'react';
import type { MCPServer } from '../../../../../shared/types';
import { apiClient } from '../../../services/api';
import { toastService } from '../../../services/toast';

export interface UseServerCRUDProps {
  lcbServers: MCPServer[];
  loadServers: () => Promise<void>;
  onError?: (message: string) => void;
}

export interface UseServerCRUDReturn {
  // Add dialog state
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
  handleAddServer: (server: Omit<MCPServer, 'status'>) => Promise<void>;

  // Edit dialog state
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  selectedLcbServer: MCPServer | null;
  handleEditServer: (id: string) => void;
  handleSaveServerEdit: (id: string, updates: Partial<MCPServer>) => Promise<void>;

  // Delete
  handleDeleteServer: (id: string) => Promise<void>;
}

/**
 * Custom hook for server CRUD operations
 * Manages dialog state and API calls for add, edit, delete operations
 */
export function useServerCRUD({
  lcbServers,
  loadServers,
  onError
}: UseServerCRUDProps): UseServerCRUDReturn {
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLcbServer, setSelectedLcbServer] = useState<MCPServer | null>(null);

  /**
   * Add a new server
   */
  const handleAddServer = async (server: Omit<MCPServer, 'status'>) => {
    try {
      await apiClient.addServer(server);
      await loadServers();
      setIsAddDialogOpen(false);
      toastService.success(`LCB server "${server.name}" added successfully`);
    } catch (err) {
      throw err;
    }
  };

  /**
   * Delete a server
   */
  const handleDeleteServer = async (id: string) => {
    try {
      const serverToDelete = lcbServers.find(s => s.id === id);
      await apiClient.deleteServer(id);
      await loadServers();
      toastService.success(`LCB server "${serverToDelete?.name || id}" deleted successfully`);
    } catch (err) {
      if (onError) {
        onError(err instanceof Error ? err.message : 'Failed to delete LCB server');
      }
    }
  };

  /**
   * Open edit dialog for a server
   */
  const handleEditServer = (id: string) => {
    const lcbServer = lcbServers.find(s => s.id === id);
    if (lcbServer) {
      setSelectedLcbServer(lcbServer);
      setIsEditDialogOpen(true);
    }
  };

  /**
   * Save edits to a server
   */
  const handleSaveServerEdit = async (id: string, updates: Partial<MCPServer>) => {
    try {
      await apiClient.updateServer(id, updates);
      await loadServers();
      setIsEditDialogOpen(false);
      setSelectedLcbServer(null);
      toastService.success(`LCB server "${updates.name || id}" updated successfully`);
    } catch (err) {
      throw err;
    }
  };

  return {
    // Add dialog
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleAddServer,

    // Edit dialog
    isEditDialogOpen,
    setIsEditDialogOpen,
    selectedLcbServer,
    handleEditServer,
    handleSaveServerEdit,

    // Delete
    handleDeleteServer
  };
}
