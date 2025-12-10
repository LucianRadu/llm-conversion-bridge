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
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useState } from 'react';
import { TextField, Button, ActionButton, Text } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Delete from '@react-spectrum/s2/icons/Delete';

interface DomainListEditorProps {
  label: string;
  domains: string[];
  onChange: (domains: string[]) => void;
}

export function DomainListEditor({ label, domains, onChange }: DomainListEditorProps) {
  const [newDomain, setNewDomain] = useState('');

  const handleAdd = () => {
    if (newDomain.trim()) {
      onChange([...domains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(domains.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <span className={style({ font: 'body', fontWeight: 'bold' })} style={{ marginBottom: '8px', display: 'block' }}>{label}</span>
      {domains.map((domain, index) => (
        <div key={index} style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <TextField
            value={domain}
            isReadOnly
            UNSAFE_style={{ width: '100%' }}
            aria-label={`${label} domain: ${domain}`}
          />
          <ActionButton onPress={() => handleRemove(index)} aria-label={`Remove ${domain}`}>
            <Delete />
          </ActionButton>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '8px' }}>
        <TextField
          value={newDomain}
          onChange={setNewDomain}
          placeholder="Enter domain URL"
          UNSAFE_style={{ width: '100%' }}
          aria-label={`Add new ${label.toLowerCase()} domain`}
        />
        <Button variant="primary" onPress={handleAdd}>
          <Text>Add</Text>
        </Button>
      </div>
    </div>
  );
}

