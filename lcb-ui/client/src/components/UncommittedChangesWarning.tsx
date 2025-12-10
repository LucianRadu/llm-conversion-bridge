import { useState, useEffect } from 'react';
import { Button, InlineAlert, Content } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import { changelogService } from '../services/changelog';
import ChangelogDialog from './ChangelogDialog';
import type { ChangelogEntry } from '../../../shared/types';

export default function UncommittedChangesWarning() {
  const [uncommittedCount, setUncommittedCount] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    // Update count on mount
    updateCount();

    // Listen for changelog updates
    const handleChangelogUpdate = () => {
      updateCount();
    };

    window.addEventListener('lcb-changelog-updated', handleChangelogUpdate);
    return () => window.removeEventListener('lcb-changelog-updated', handleChangelogUpdate);
  }, []);

  const updateCount = async () => {
    const count = await changelogService.getUncommittedCount();
    setUncommittedCount(count);
    setEntries(await changelogService.getUncommittedEntries());
  };

  const handleViewChanges = async () => {
    setEntries(await changelogService.getUncommittedEntries());
    setIsDialogOpen(true);
  };

  // Don't show if no uncommitted changes
  if (uncommittedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={style({
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          maxWidth: 800,
          width: 'auto'
        })}
      >
        <InlineAlert variant="notice">
          <Content>
            <div
              className={style({
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16
              })}
            >
              <span className={style({ flex: 1, whiteSpace: 'nowrap' })}>
                {uncommittedCount} uncommitted change{uncommittedCount !== 1 ? 's' : ''}
              </span>
              <Button
                variant="secondary"
                onPress={handleViewChanges}
                size="S"
                styles={style({ minWidth: 120 })}
              >
                View Changes
              </Button>
            </div>
          </Content>
        </InlineAlert>
      </div>

      {/* Changelog Dialog */}
      <ChangelogDialog
        isOpen={isDialogOpen}
        entries={entries}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
